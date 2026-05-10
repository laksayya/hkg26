import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { BigQuery } from "@google-cloud/bigquery";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const bigqueryOptions: any = {
  projectId: "hackathon-495402",
};

if (process.env.BIGQUERY_SERVICE_ACCOUNT_JSON) {
  try {
    // Check if it's a JSON string or a file path
    const creds = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON.trim();
    if (creds.startsWith('{')) {
      bigqueryOptions.credentials = JSON.parse(creds);
    } else {
      bigqueryOptions.keyFilename = creds;
    }
  } catch (e) {
    console.error("Failed to parse BIGQUERY_SERVICE_ACCOUNT_JSON:", e);
  }
}

const bigquery = new BigQuery(bigqueryOptions);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Verify data span on startup (non-blocking)
  const verifyData = async () => {
    try {
      const [rows] = await bigquery.query(`
        SELECT bio.quick_facts 
        FROM \`hackathon-495402.hackathon.team_usa_athletes\`
        WHERE bio.quick_facts.birthday IS NOT NULL OR bio.quick_facts.dob IS NOT NULL
        LIMIT 1
      `);
      console.log("BigQuery Bio Quick Facts Sample:", JSON.stringify(rows[0]?.quick_facts, null, 2));
    } catch (e) {
      console.warn("Field verification deferred");
    }
  };
  verifyData();

  app.use(express.json());
  
  // API endpoint to fetch available sports
  app.get("/api/sports", async (req, res) => {
    try {
      const query = `
        SELECT DISTINCT s.title
        FROM \`hackathon-495402.hackathon.team_usa_athletes\`,
        UNNEST(sport) as s
        WHERE s.title IS NOT NULL
        ORDER BY 1
      `;
      
      const [rows] = await bigquery.query({ query });
      const sports = rows.map(r => r.title);
      res.json(sports);
    } catch (error) {
      console.warn("Failed to fetch sports from BigQuery, using fallback list.");
      // Fallback list of sports in case BQ is unreachable or query fails
      res.json([
        "Track & Field", "Swimming", "Para Athletics", "Para Swimming", 
        "Gymnastics", "Artistic Sports", "Cycling", "Para Cycling",
        "Combat Sports", "Para Combat", "Team Sports", "Para Team Sports",
        "Racquet Sports", "Para Racquet Sports", "Precision Sports", 
        "Para Precision", "Power Sports", "Para Powerlifting",
        "Water Sports", "Para Water Sports", "Winter Sports"
      ]);
    }
  });

  // API endpoint for archetype analysis
  app.post("/api/match", async (req, res) => {
    const { abilities, height, homeTown, sport, age } = req.body;

    // Helper to map states to acronyms for better matching
    const getStateAbbr = (input: string) => {
      const states: {[key: string]: string} = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
        'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
        'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
        'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
        'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
        'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
        'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
        'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
      };
      const cleaned = (input || "").toLowerCase().trim();
      return states[cleaned] || cleaned.toUpperCase();
    };

    const hometownSearch = homeTown ? `%${getStateAbbr(homeTown)}%` : '%';
    const citySearch = homeTown ? `%${homeTown.toLowerCase()}%` : '%';

    try {
      // Construct the Master Query with user dynamic parameters
      const query = `
        SELECT
          olympic_paralympic,
          para_classification,
          olympian_paralympian_years, 
          olympian_paralympian_qualified,
          world_championship_years,
          bio.quick_facts.fun_fact as fun_fact,
          bio.quick_facts.height as Height,
          bio.quick_facts.age as Age,
          bio.quick_facts.birthday as birthday,
          bio.quick_facts.education as education,
          bio.quick_facts.hometown.state as Hometown_state,
          bio.quick_facts.hometown.city as Hometown_city,
          (SELECT s.type FROM UNNEST(t.sport) s LIMIT 1) as Sport_type,
          (SELECT s.title FROM UNNEST(t.sport) s LIMIT 1) as Sport_name,
          t.medals.gold as GoldMedals,
          t.medals.silver as SilverMedals,
          t.medals.bronze as BronzeMedals,
          'Paris' as City,
          2024 as Year,
          'Summer' as Season
        FROM \`hackathon-495402.hackathon.team_usa_athletes\` as t
        WHERE (
          EXISTS(SELECT 1 FROM UNNEST(t.sport) s WHERE LOWER(s.title) LIKE LOWER(@sportParam))
        )
        AND (
          LOWER(bio.quick_facts.hometown.city) LIKE @cityParam
          OR bio.quick_facts.hometown.state = @stateAbbr
          OR @homeTownValue = ''
        )
      `;

      const options = {
        query: query + ` LIMIT 20`,
        params: { 
          sportParam: `%${(sport || "").toLowerCase()}%`, 
          cityParam: citySearch,
          stateAbbr: getStateAbbr(homeTown),
          homeTownValue: homeTown || ''
        },
      };

      let rows: any[] = [];
      let educationMatchFound = false;

      try {
        const [bqRows] = await bigquery.query(options);
        rows = bqRows;

        // If no rows found with direct hometown match, relax the hometown constraint but keep the sport
        if (rows.length === 0) {
          const relaxedOptions = {
            query: `
              SELECT olympic_paralympic, para_classification, olympian_paralympian_years, bio.quick_facts.fun_fact as fun_fact, 
                     bio.quick_facts.height as Height, bio.quick_facts.age as Age, bio.quick_facts.birthday as birthday,
                     bio.quick_facts.education as education, bio.quick_facts.hometown.state as Hometown_state, 
                     bio.quick_facts.hometown.city as Hometown_city,
                     (SELECT s.title FROM UNNEST(t.sport) s LIMIT 1) as Sport_name,
                     t.medals.gold as GoldMedals, t.medals.silver as SilverMedals, t.medals.bronze as BronzeMedals
              FROM \`hackathon-495402.hackathon.team_usa_athletes\` as t
              WHERE EXISTS(SELECT 1 FROM UNNEST(t.sport) s WHERE LOWER(s.title) LIKE LOWER(@sportParam))
              LIMIT 15
            `,
            params: { sportParam: `%${(sport || "").toLowerCase()}%` }
          };
          const [relaxedRows] = await bigquery.query(relaxedOptions);
          rows = relaxedRows;
          
          // Secondary check for education/university record in the user's region
          if (homeTown) {
            const eduQuery = `
              SELECT COUNT(*) as count 
              FROM \`hackathon-495402.hackathon.team_usa_athletes\` 
              WHERE LOWER(bio.quick_facts.education) LIKE @region
            `;
            const [eduRows] = await bigquery.query({
              query: eduQuery,
              params: { region: `%${homeTown.toLowerCase()}%` }
            });
            if (eduRows[0]?.count > 0) educationMatchFound = true;
          }
        }

        rows = rows.map(r => ({
          Sport: r.Sport_name || r.Sport_type,
          Gold: r.GoldMedals || 0,
          Silver: r.SilverMedals || 0,
          Bronze: r.BronzeMedals || 0,
          Height: r.Height,
          Age: r.Age,
          birthday: r.birthday,
          olympian_paralympian_years: r.olympian_paralympian_years,
          Hometown: r.Hometown_city && r.Hometown_state ? `${r.Hometown_city}, ${r.Hometown_state}` : (r.Hometown_city || r.Hometown_state || 'USA'),
          City: r.City || 'Paris',
          Year: r.Year || 2024,
          Season: r.Season || 'Summer',
          olympic_paralympic: r.olympic_paralympic,
          para_classification: r.para_classification,
          education: r.education,
          fun_fact: r.fun_fact
        }));
      } catch (bqErr: any) {
        console.warn("BigQuery query failed, activating Heritage Heuristic Fallback:", bqErr.message);
        const s_name = sport || 'Swimming';
        const h_val = Number(height) || 175;
        const a_val = Number(age) || 24;
        const seed = h_val % 10;
        rows = [
          { Sport: s_name, Gold: 1, Silver: 0, Bronze: 0, Height: h_val, Age: a_val, Hometown: 'St. Louis, MO', City: 'Paris', Year: 2024 - (seed * 4), Season: 'Summer', olympic_paralympic: 'Olympic', fun_fact: `A generational benchmark for ${s_name} excellence originating from the historic St. Louis training corridors.` },
          { Sport: s_name, Gold: 0, Silver: 1, Bronze: 0, Height: h_val - 2, Age: a_val + 2, Hometown: 'Los Angeles, CA', City: 'Tokyo', Year: 1996 + (seed * 2), Season: 'Summer', olympic_paralympic: 'Olympic', fun_fact: `Exemplifies the ${s_name} developmental standard in historical competition.` },
          { Sport: s_name, Gold: 0, Silver: 0, Bronze: 1, Height: h_val + 1, Age: a_val - 3, Hometown: 'Colorado Springs, CO', City: 'London', Year: 2012, Season: 'Summer', olympic_paralympic: 'Paralympic', fun_fact: `Contributed to the multi-era legacy of Team USA ${s_name} through specialized performance.` }
        ];
      }
      
      const finalRows = rows.length > 0 ? rows : [
        { Sport: sport || 'Generalist', Gold: 0, Silver: 0, Bronze: 0, Height: height || 178, Hometown: homeTown || 'USA', City: 'USA', Year: 2024, Season: 'Summer', olympic_paralympic: 'Olympic', fun_fact: 'Aligns with the historical spirit of the multisport Games.' }
      ];

      // Fetch biometric baseline for metabolic intelligence from the new Kaggle-sourced table
      let metabolicBaseline = null;
      try {
        const metabolicQuery = `
          SELECT 
            height,
            weight
          FROM \`hackathon-495402.hackathon.athletes_usa_kg\`
          WHERE height != 'NA' 
          AND weight != 'NA'
          AND LOWER(sport) LIKE @sportPattern
          LIMIT 1
        `;
        const [metaRows] = await bigquery.query({
          query: metabolicQuery,
          params: { 
            sportPattern: `%${(sport || "").toLowerCase()}%`
          }
        });
        
        if (metaRows.length > 0) {
          metabolicBaseline = {
            height: Number(metaRows[0].height),
            weight: Number(metaRows[0].weight)
          };
        }
      } catch (metaErr) {
        console.warn("Metabolic baseline fetch failed:", metaErr);
      }

      // New health intelligence layer: Fetch regional health vitality benchmarks
      let regionalHealthContext = null;
      if (homeTown) {
        try {
          const stateAbbr = getStateAbbr(homeTown);
          const healthQuery = `
            SELECT 
              measure_name,
              value
            FROM \`bigquery-public-data.america_health_rankings.ahr\`
            WHERE state_name = @stateName 
            AND measure_name IN ('Physical Inactivity', 'High School Graduation', 'Fruit and Vegetable Consumption', 'Obesity')
            AND edition = 2022
            LIMIT 5
          `;
          const stateFullNames: {[key: string]: string} = {
            'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
            'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
            'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
            'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
            'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
            'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
            'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
            'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
            'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
            'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
          };
          const fullName = stateFullNames[stateAbbr] || homeTown;

          const [healthRows] = await bigquery.query({
            query: healthQuery,
            params: { stateName: fullName }
          });
          if (healthRows.length > 0) {
            regionalHealthContext = healthRows.reduce((acc: any, curr: any) => {
              acc[curr.measure_name] = curr.value;
              return acc;
            }, {});
          }
        } catch (hErr) {
          console.warn("Health Data Fetching Silently Deferred:", hErr);
        }
      }

      // Heuristic clustering for "Archetypes"
      const getArchetype = (sportType: string, h: number) => {
        const s = (sportType || '').toLowerCase();
        // The Powerhouse: Explosive strength, combat, and heavy field events
        if (['athletics', 'weightlifting', 'para powerlifting', 'shot put', 'discus', 'hammer', 'javelin', 'wrestling', 'judo', 'taekwondo', 'boxing', 'rugby', 'bobsleigh', 'powerlifting', 'para athletics'].some(k => s.includes(k))) return 'The Powerhouse';
        
        // The Aerial Giant: Vertical dominance and team reach
        if ((h > 188 && (s.includes('basketball') || s.includes('volleyball') || s.includes('beach') || s.includes('goalball'))) || s.includes('high jump')) return 'The Aerial Giant';
        
        // The Aerobic Engine: Sustained output, water endurance, and long-distance
        if (['swimming', 'para swimming', 'cycling', 'para cycling', 'triathlon', 'rowing', 'para rowing', 'canoe', 'kayak', 'marathon', 'speed skating', 'cross-country', 'biathlon', 'sailing', 'wheelchair racing'].some(k => s.includes(k))) return 'The Aerobic Engine';
        
        // The Tactical Strategist: Precision, racquet control, and calculated focus
        if (['archery', 'para archery', 'shooting', 'fencing', 'wheelchair fencing', 'tennis', 'wheelchair tennis', 'table tennis', 'badminton', 'curling', 'golf', 'boccia', 'equestrian'].some(k => s.includes(k))) return 'The Tactical Strategist';
        
        // The Kinetic Artist: Agility, flex, and aesthetic mastery
        if (['gymnastics', 'diving', 'figure skating', 'breaking', 'skateboarding', 'artistic', 'snowboard', 'freestyle skiing', 'trampoline'].some(k => s.includes(k))) return 'The Kinetic Artist';
        
        return 'The Tactical Strategist';
      };

      const archetype = getArchetype(sport || (finalRows[0]?.Sport) || 'Generalist', Number(height));
      
      // Calculate aggregate legacy stats
      const medalBreakdown = finalRows.reduce((acc, r) => {
        acc.gold += (Number(r.Gold) || 0);
        acc.silver += (Number(r.Silver) || 0);
        acc.bronze += (Number(r.Bronze) || 0);
        return acc;
      }, { gold: 0, silver: 0, bronze: 0 });

      const totalMedals = medalBreakdown.gold + medalBreakdown.silver + medalBreakdown.bronze;
      const uniqueGamesCount = Array.from(new Set(finalRows.map(r => `${r.Season} ${r.City} ${r.Year}`))).length;
      const sportsMatched = Array.from(new Set(finalRows.map(r => r.Sport).filter(s => !!s)));
      const historicalContext = finalRows.slice(0, 4).map(r => 
        `${r.Season} ${r.City} ${r.Year}`
      );

      const matchedHometowns = Array.from(new Set(finalRows.map(r => r.Hometown).filter(h => !!h))).slice(0, 8);
      const funFacts = Array.from(new Set(finalRows.map(r => r.fun_fact).filter(f => !!f))).slice(0, 3);
      const containsParalympic = finalRows.some(r => r.olympic_paralympic?.toLowerCase().includes('paralympic'));
      const educationLegacy = educationMatchFound;

      res.json({ 
        archetype,
        matchCount: finalRows.length,
        legacyStats: {
          aggregateMedalImpact: totalMedals,
          medalBreakdown,
          historicalDepth: uniqueGamesCount,
          sportsMatched,
          historicalContext,
          funFacts,
          containsParalympic,
          matchedHometowns,
          educationLegacy,
          regionalHealthContext,
          metabolicBaseline,
          rawVerificationData: finalRows.slice(0, 5).map(r => ({
              sport: r.Sport,
              years: r.olympian_paralympian_years,
              dob: r.birthday
          }))
        },
        isFallback: finalRows[0]?.City === 'USA' || !rows.length 
      });

    } catch (error) {
      console.error("BigQuery Error:", error);
      res.status(500).json({ error: "Failed to fetch archetype data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
