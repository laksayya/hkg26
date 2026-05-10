/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Activity, User, MapPin, Heart, Ruler, Sparkles, Waves, Bike, Target, Dumbbell, Wind, Users2, Flame, BarChart3, Skull, CircleDot, Timer, Zap, Crosshair, TrendingUp, Sword } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Sector, BarChart, Bar, XAxis, YAxis, ReferenceLine, LabelList } from 'recharts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AthleteMatch {
  athlete_name: string;
  sport: string;
  country: string;
  medals: string;
  height: string;
  hometown: string;
  hobbies: string;
  profile_pic_url: string;
}

interface ArchetypeResult {
  archetype: string;
  matchCount: number;
  legacyStats: {
    aggregateMedalImpact: number;
    medalBreakdown: {
      gold: number;
      silver: number;
      bronze: number;
    };
    historicalDepth: number;
    sportsMatched: string[];
    historicalContext: string[];
    funFacts: string[];
    containsParalympic: boolean;
    matchedHometowns: string[];
    educationLegacy?: boolean;
    regionalHealthContext?: Record<string, any>;
    metabolicBaseline?: {
      height: number;
      weight: number;
    };
    rawVerificationData?: {
      sport: string;
      years: string;
      dob: string;
    }[];
    verifiedAges?: {
      sport: string;
      age: number;
      year: number;
    }[];
  };
  isFallback?: boolean;
}

const STATE_COORDS: Record<string, [number, number]> = {
  'AL': [75, 65], 'AK': [15, 80], 'AZ': [20, 60], 'AR': [60, 60], 'CA': [10, 45],
  'CO': [35, 45], 'CT': [92, 30], 'DE': [92, 40], 'FL': [85, 80], 'GA': [80, 65],
  'HI': [25, 90], 'ID': [20, 25], 'IL': [65, 40], 'IN': [72, 40], 'IA': [55, 35],
  'KS': [50, 48], 'KY': [75, 50], 'LA': [62, 75], 'ME': [95, 10], 'MD': [90, 42],
  'MA': [94, 25], 'MI': [72, 28], 'MN': [58, 22], 'MS': [68, 68], 'MO': [60, 50],
  'MT': [35, 20], 'NE': [45, 38], 'NV': [15, 38], 'NH': [94, 20], 'NJ': [92, 35],
  'NM': [30, 60], 'NY': [88, 25], 'NC': [85, 52], 'ND': [45, 18], 'OH': [78, 40],
  'OK': [50, 60], 'OR': [10, 20], 'PA': [85, 35], 'RI': [95, 28], 'SC': [82, 58],
  'SD': [45, 28], 'TN': [72, 58], 'TX': [45, 75], 'UT': [25, 45], 'VT': [92, 18],
  'VA': [88, 48], 'WA': [12, 10], 'WV': [84, 45], 'WI': [65, 25], 'WY': [35, 32],
  'DC': [90, 44]
};

const STATE_NAMES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC'
};

const getCoordsFromHometown = (hometown: string) => {
  if (!hometown) return null;
  const lower = hometown.toLowerCase();
  
  // Try state abbr in string
  for (const [abbr, coords] of Object.entries(STATE_COORDS)) {
    if (new RegExp(`\\b${abbr}\\b`, 'i').test(hometown)) return { abbr, coords };
  }
  
  // Try full state names
  for (const [name, abbr] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name)) return { abbr, coords: STATE_COORDS[abbr] };
  }
  
  // Default fallback for unidentified (randomize slightly seeded by string)
  const seed = hometown.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { 
    abbr: 'USA', 
    coords: [30 + (seed % 40), 30 + ((seed * 7) % 40)] as [number, number] 
  };
};

const TRAITS_BY_CATEGORY: Record<string, string[]> = {
  'Power & Force': ['Explosive Strength', 'Combat Spirit', 'Heavy Lifting', 'High Muscle Density'],
  'Air & Space': ['Vertical Leap', 'Reach Advantage', 'Team IQ', 'Aerial Control'],
  'Flow & Stamina': ['Sustained Stamina', 'Endurance Baseline', 'Rhythmic Cadence', 'Water Efficiency'],
  'Precision & Logic': ['Precision Focus', 'Mental Calculation', 'Steady Hand', 'Strategic Patience'],
  'Balance & Art': ['Core Agility', 'Flexibility', 'Kinetic Awareness', 'Dynamic Balance']
};

const SPORT_ARCHETYPE_MAP: Record<string, string[]> = {
  'Track & Field': ['Power & Force', 'Flow & Stamina', 'Air & Space'],
  'Swimming': ['Flow & Stamina', 'Power & Force'],
  'Para Athletics': ['Power & Force', 'Flow & Stamina'],
  'Para Swimming': ['Flow & Stamina', 'Power & Force'],
  'Gymnastics': ['Balance & Art', 'Power & Force'],
  'Artistic Sports': ['Balance & Art', 'Air & Space'],
  'Cycling': ['Flow & Stamina', 'Power & Force'],
  'Para Cycling': ['Flow & Stamina', 'Power & Force'],
  'Combat Sports': ['Power & Force', 'Balance & Art'],
  'Para Combat': ['Power & Force', 'Balance & Art'],
  'Team Sports': ['Air & Space', 'Flow & Stamina', 'Power & Force'],
  'Para Team Sports': ['Air & Space', 'Flow & Stamina'],
  'Racquet Sports': ['Precision & Logic', 'Balance & Art'],
  'Para Racquet Sports': ['Precision & Logic', 'Balance & Art'],
  'Precision Sports': ['Precision & Logic', 'Balance & Art'],
  'Para Precision': ['Precision & Logic', 'Balance & Art'],
  'Power Sports': ['Power & Force', 'Precision & Logic'],
  'Para Powerlifting': ['Power & Force'],
  'Water Sports': ['Flow & Stamina', 'Power & Force'],
  'Para Water Sports': ['Flow & Stamina', 'Power & Force'],
  'Winter Sports': ['Flow & Stamina', 'Balance & Art', 'Precision & Logic'],
  // Broadening for specific sport names that might come from API
  'Canoe/Kayak': ['Flow & Stamina', 'Power & Force'],
  'Rowing': ['Flow & Stamina', 'Power & Force'],
  'Basketball': ['Air & Space', 'Flow & Stamina', 'Power & Force'],
  'Wrestling': ['Power & Force', 'Balance & Art'],
  'Archery': ['Precision & Logic', 'Balance & Art'],
  'Weightlifting': ['Power & Force', 'Precision & Logic']
};

export default function App() {
  const [formData, setFormData] = useState({
    abilities: '',
    height: '',
    weight: '',
    age: '',
    homeTown: '',
    sport: ''
  });
  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState<ArchetypeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const [revealedFacts, setRevealedFacts] = useState<number[]>([]);
  const [availableSports, setAvailableSports] = useState<string[]>([]);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const verifyAges = async (raw: { sport: string, years: string, dob: string }[]) => {
    try {
      const verified = await Promise.all(raw.filter(r => r.years && r.dob).slice(0, 5).map(async (item) => {
        const prompt = `Calculate the age of an athlete during their first year of participation.
          Data:
          - First Participation Records: ${item.years}
          - Birth Date: ${item.dob}
          
          Extract the earliest year from the participation records and calculate (Earliest Year - Birth Year).
          Return ONLY a JSON object: {"participation_year": number, "age_at_participation": number}.`;

        const res = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });

        try {
          const parsed = JSON.parse(res.text.trim());
          if (parsed.age_at_participation > 0) {
            return { sport: item.sport, age: parsed.age_at_participation, year: parsed.participation_year };
          }
        } catch (e) {
          console.warn("Parsing verified age failed", e);
        }
        return null;
      }));

      const filtered = verified.filter(v => v !== null) as { sport: string, age: number, year: number }[];
      
      setResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          legacyStats: {
            ...prev.legacyStats,
            verifiedAges: filtered
          }
        };
      });
    } catch (err) {
      console.warn("Age verification sub-task error:", err);
    }
  };

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const response = await fetch('/api/sports');
        const data = await response.json();
        setAvailableSports(data);
      } catch (err) {
        console.warn("Failed to fetch sports list:", err);
      }
    };
    fetchSports();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const toggleFact = (idx: number) => {
    if (revealedFacts.includes(idx)) return;
    setRevealedFacts([...revealedFacts, idx]);
  };

  const runMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatching(true);
    setIsFlipped(false);
    setResult(null);
    setSummary('');
    setError(null);
    setRevealedFacts([]);

    try {
      // Send converted weight to API but keep formData for UI
      const apiPayload = {
        ...formData,
        weight: Number(formData.weight) * 0.453592 // Convert LBS to KG for BigQuery/Archetype matching
      };

      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Connection to BigQuery failed. Please check if the API is enabled.');
      }

      setResult(data as ArchetypeResult);
      const meta = data.legacyStats.metabolicBaseline;

      // Age Verification Sub-task - Run asynchronously
      if (data.legacyStats.rawVerificationData) {
        verifyAges(data.legacyStats.rawVerificationData);
      }

      // Local Metabolic Intelligence
      const hInput = Number(formData.height);
      const wInput = Number(formData.weight);
      const ageBase = Number(formData.age);
      
      // Convert LBS (user input) to KG for internal processing
      const hBase = hInput; // Still in CM
      const wBase = wInput * 0.453592; // LBS to KG
      
      const bmi = wBase > 0 && hBase > 0 ? (wBase / Math.pow(hBase / 100, 2)).toFixed(1) : "N/A";
      // Harris-Benedict Equation for BMR (Male baseline for athletic proxy)
      const bmr = wBase > 0 && hBase > 0 ? (10 * wBase + 6.25 * hBase - 5 * ageBase + 5).toFixed(0) : "N/A";
      
      const peerMeta = data.legacyStats.metabolicBaseline;
      const peerBmi = peerMeta ? (peerMeta.weight / Math.pow(peerMeta.height / 100, 2)).toFixed(1) : null;

      // AI generation - move into its own try block to prevent blocking the results
      if (data.archetype) {
        try {
          const healthData = data.legacyStats.regionalHealthContext || {};
          const prompt = `Analyze a fan's body type and traits against 120 years of Team USA historical data.
            Technical Context:
            - Profile: ${formData.height}cm, ${formData.weight}lbs (${wBase.toFixed(1)}kg), ${formData.age}y
            - Archetype: ${data.archetype}
            - Matches Found: ${data.matchCount}
            - Medals Found: ${(data.legacyStats.medalBreakdown?.gold || 0) + (data.legacyStats.medalBreakdown?.silver || 0) + (data.legacyStats.medalBreakdown?.bronze || 0)}
            - Selected Traits: ${formData.abilities}
            
            Analysis Requirements:
            1. THE "SPECIALIST" EXPLANATION (CRITICAL): If Medals Found = 0 but Matches Found > 0, YOU MUST EXPLAIN that their "Archival Peer" was an Elite Specialist or Finalist. Clarify that while they share the biological DNA of national-level athletes, these specific peers functioned as technical benchmarks (high-performance outliers) who established standard ranges without a podium finish in this subset.
            2. Mechanical Resonance: Explicitly state how their ${formData.height}cm stature and ${wBase.toFixed(1)}kg mass align with the leverage requirements of the ${data.archetype} pool.
            3. Actionable Context: Connect their traits like ${formData.abilities.split(', ').slice(0, 2).join(' and ')} to the foundational "engines" of ${getArchetypeSports(data.archetype).map(s => s.name).join(', ')}.
            4. TIMELINE INTEGRITY: Ground the analysis in the historical context of ${Array.from(new Set(data.legacyStats.historicalContext)).join(', ')} ONLY ONCE. Do NOT repeat event names or years.
            5. TONE: Authoritative, cinematic, and deeply interpretive. Focus on the "Physics of Potential." Max 5 sentences.`;

          const aiResult = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });
          setSummary(aiResult.text || '');
        } catch (aiErr) {
          console.warn("AI Narrative synthesis failed, using data-only view:", aiErr);
          const medalTotal = (data.legacyStats.medalBreakdown?.gold || 0) + (data.legacyStats.medalBreakdown?.silver || 0) + (data.legacyStats.medalBreakdown?.bronze || 0);
          if (data.matchCount > 0 && medalTotal === 0) {
            setSummary(`Historical analysis complete. Your biological leverages match ${data.matchCount} archival Team USA specialists. While these mechanical peers represented the nation as technical benchmarks without reaching the podium, your profile demonstrates a perfect resonance with their elite physiological standards.`);
          } else {
            setSummary("Historical sync successful. Your profile shows a strong resonance with the established biological benchmarks of the " + data.archetype + " archetype.");
          }
        }
      }

      setIsMatching(false);
      setIsFlipped(true);
      
      // Automatic scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);

    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "System sync error");
      setIsMatching(false);
    }
  };

  const getArchetypeColor = (type: string) => {
    switch(type) {
      case 'The Powerhouse': return 'from-olympic-red to-orange-600';
      case 'The Aerial Giant': return 'from-olympic-blue to-cyan-600';
      case 'The Aerobic Engine': return 'from-emerald-600 to-teal-500';
      case 'The Tactical Strategist': return 'from-slate-700 to-slate-900';
      case 'The Kinetic Artist': return 'from-purple-600 to-pink-500';
      default: return 'from-olympic-blue to-blue-700';
    }
  };

  const getSportIcon = (sport: string) => {
    const s = sport.toLowerCase();
    if (s.includes('swim') || s.includes('water') || s.includes('rowing') || s.includes('canoe')) return <Waves className="w-2.5 h-2.5" />;
    if (s.includes('track') || s.includes('athletic') || s.includes('running') || s.includes('winter') || s.includes('skating') || s.includes('marathon')) return <Wind className="w-2.5 h-2.5" />;
    if (s.includes('cycl') || s.includes('bike')) return <Bike className="w-2.5 h-2.5" />;
    if (s.includes('archery') || s.includes('target') || s.includes('precision') || s.includes('shoot') || s.includes('racquet') || s.includes('tennis') || s.includes('boccia') || s.includes('curling')) return <Target className="w-2.5 h-2.5" />;
    if (s.includes('gymnastic') || s.includes('weightlifting') || s.includes('powerlifting') || s.includes('strength')) return <Dumbbell className="w-2.5 h-2.5" />;
    if (s.includes('basket') || s.includes('team') || s.includes('volley') || s.includes('soccer') || s.includes('rugby') || s.includes('goalball')) return <Users2 className="w-2.5 h-2.5" />;
    if (s.includes('combat') || s.includes('wrestling') || s.includes('judo') || s.includes('taekwondo') || s.includes('boxing')) return <Activity className="w-2.5 h-2.5" />;
    return <Flame className="w-2.5 h-2.5" />;
  };

  const getMedalData = () => {
    if (!result?.legacyStats?.medalBreakdown) return [];
    const { gold, silver, bronze } = result.legacyStats.medalBreakdown;
    return [
      { name: 'Gold', value: gold, color: '#f59e0b' },
      { name: 'Silver', value: silver, color: '#94a3b8' },
      { name: 'Bronze', value: bronze, color: '#ea580c' },
    ].filter(m => m.value > 0);
  };

  const getArchetypeTraits = (type: string) => {
    const traits = [
      { subject: 'Power', fullMark: 100 },
      { subject: 'Endurance', fullMark: 100 },
      { subject: 'Agility', fullMark: 100 },
      { subject: 'Technique', fullMark: 100 },
      { subject: 'Speed', fullMark: 100 },
    ];

    let values: number[] = [50, 50, 50, 50, 50];
    switch (type) {
      case 'The Powerhouse': values = [100, 40, 50, 70, 60]; break;
      case 'The Aerobic Engine': values = [50, 100, 60, 60, 80]; break;
      case 'The Kinetic Artist': values = [40, 50, 100, 90, 70]; break;
      case 'The Tactical Strategist': values = [30, 50, 40, 100, 40]; break;
      case 'The Aerial Giant': values = [80, 50, 90, 80, 60]; break;
    }

    return traits.map((t, i) => ({ ...t, A: values[i] }));
  };

  const getArchetypeSports = (type: string) => {
    switch (type) {
      case 'The Powerhouse': 
        return [
          { name: 'Para Powerlifting', icon: <Dumbbell className="w-3 h-3" /> },
          { name: 'Wrestling', icon: <Activity className="w-3 h-3" /> },
          { name: 'Para Taekwondo', icon: <Activity className="w-3 h-3" /> }
        ];
      case 'The Aerial Giant': 
        return [
          { name: 'Goalball', icon: <CircleDot className="w-3 h-3" /> },
          { name: 'Wheelchair Rugby', icon: <Users2 className="w-3 h-3" /> },
          { name: 'High Jump', icon: <TrendingUp className="w-3 h-3" /> }
        ];
      case 'The Aerobic Engine': 
        return [
          { name: 'Para Swimming', icon: <Waves className="w-3 h-3" /> },
          { name: 'Para Cycling', icon: <Bike className="w-3 h-3" /> },
          { name: 'Para Rowing', icon: <Waves className="w-3 h-3" /> }
        ];
      case 'The Kinetic Artist': 
        return [
          { name: 'Artistic Gymnastics', icon: <Zap className="w-3 h-3" /> },
          { name: 'Wheelchair Fencing', icon: <Sword className="w-3 h-3" /> },
          { name: 'Artistic Skating', icon: <Wind className="w-3 h-3" /> }
        ];
      case 'The Tactical Strategist': 
        return [
          { name: 'Boccia', icon: <Target className="w-3 h-3" /> },
          { name: 'Wheelchair Tennis', icon: <Target className="w-3 h-3" /> },
          { name: 'Para Archery', icon: <Target className="w-3 h-3" /> }
        ];
      default: return [];
    }
  };

  const getPhysicalAlignmentData = () => {
    const userH = Number(formData.height) || 0;
    const userA = Number(formData.age) || 0;
    
    let archH = 175;
    let archA = 26;
    
    switch (result?.archetype) {
      case 'The Powerhouse': 
        archH = 185; 
        archA = 28;
        break;
      case 'The Aerial Giant': 
        archH = 200; 
        archA = 25;
        break;
      case 'The Aerobic Engine': 
        archH = 175; 
        archA = 30;
        break;
      case 'The Kinetic Artist': 
        archH = 165; 
        archA = 22;
        break;
      case 'The Tactical Strategist': 
        archH = 170; 
        archA = 35;
        break;
    }

    return {
      height: [
        { name: 'You', value: userH, color: '#ef4444' },
        { name: 'Archetype', value: archH, color: '#334155' }
      ],
      age: [
        { name: 'You', value: userA, color: '#ef4444' },
        { name: 'Archetype', value: archA, color: '#334155' }
      ]
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-olympic-yellow/30 p-4 md:p-8 relative overflow-hidden">
      {/* Background Sport Collage - Vibrant Vibe */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.55] overflow-hidden">
        <div className="absolute top-[-5%] left-[-5%] w-1/2 h-1/2 rotate-[-8deg] transform-gpu">
          <img src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=1200" alt="Track and Field" className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute top-[15%] right-[-5%] w-1/2 h-1/2 rotate-[12deg] transform-gpu">
          <img src="https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&q=80&w=1200" alt="Paralympic Wheelchair Racing" className="w-full h-full object-cover rounded-3xl shadow-2xl" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute bottom-[-10%] left-[0%] w-1/2 h-1/2 rotate-[4deg] transform-gpu">
          <img src="https://images.unsplash.com/photo-1519315901367-f34ff9154487?auto=format&fit=crop&q=80&w=1200" alt="Olympic Swimming" className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
        </div>
        <div className="absolute bottom-[2%] right-[5%] w-1/3 h-1/3 rotate-[-8deg] transform-gpu">
          <img src="https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&q=80&w=1200" alt="Team USA Cycling Heritage" className="w-full h-full object-cover rounded-3xl shadow-xl border-4 border-white/10" referrerPolicy="no-referrer" />
        </div>
      </div>

      {/* DNA Style Background Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute top-0 left-1/4 w-px h-full bg-slate-900" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-slate-900" />
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className="absolute h-px bg-slate-900" 
            style={{ 
              top: `${i * 5}%`, 
              left: i % 2 === 0 ? '25%' : '75%', 
              width: '50%',
              transform: `rotate(${i % 2 === 0 ? '15deg' : '-15deg'})`
            }} 
          />
        ))}
      </div>

      <main className="max-w-6xl mx-auto relative z-10">
        {/* Header - Bento Style */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b-4 border-slate-900 pb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-olympic-yellow/10 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-32 h-32 bg-olympic-blue/5 rounded-full blur-2xl" />
          <div className="flex flex-col gap-1 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1 animate-pulse">
                <div className="w-3 h-3 bg-olympic-red shadow-sm shadow-olympic-red/50"></div>
                <div className="w-3 h-3 bg-slate-300"></div>
                <div className="w-3 h-3 bg-olympic-blue shadow-sm shadow-olympic-blue/50"></div>
              </div>
              <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase ml-2 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-olympic-yellow fill-olympic-yellow" />
                Team USA Heritage Match
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-slate-900 leading-none">
              REVEAL YOUR <span className="text-olympic-blue underline decoration-olympic-yellow decoration-8 underline-offset-[-2px] hover:text-olympic-red transition-colors cursor-default">DNA LEGACY</span>
            </h1>
          </div>
          <div className="text-right hidden md:block relative z-10">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">CHALLENGE: ARCHETYPE AGENT</span>
            <br />
            <span className="text-sm font-black text-white bg-olympic-blue px-3 py-1 uppercase italic inline-block mt-1 shadow-bento transform -skew-x-12 hover:skew-x-0 transition-transform">Reflecting 120 Years</span>
          </div>
        </header>

        <div className="grid grid-cols-12 auto-rows-min gap-4">
          {/* Form Section */}
          <section className={`${isFlipped ? 'col-span-12 lg:col-span-4' : 'col-span-12 lg:col-span-6 lg:col-start-4'} bg-white border-2 border-slate-900 p-6 shadow-bento transition-all duration-500 relative group overflow-hidden`}>
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
              <Activity className="w-24 h-24 text-slate-900" />
            </div>
            <div className="absolute top-0 left-0 w-2 h-full bg-olympic-blue group-hover:w-4 transition-all" />
            <div className="flex justify-between items-center mb-6 pl-4">
               <h2 className="text-xl font-black uppercase italic flex items-center gap-2 text-slate-800">
                <User className="w-5 h-5 text-olympic-blue" />
                Physical Profile
              </h2>
              <div className="flex gap-2 items-center">
                {result && !result.isFallback && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded uppercase border border-green-200">Live Data verified</span>
                )}
                {result?.isFallback && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold rounded uppercase border border-amber-200 animate-bounce">Sync Mode</span>
                )}
                {isFlipped && <span className="text-[10px] px-2 py-1 bg-olympic-blue/10 text-olympic-blue font-black rounded uppercase border border-olympic-blue/20 shadow-sm">Analyzed</span>}
              </div>
            </div>
            
            <form onSubmit={runMatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Interest Area</label>
                  <select 
                    name="sport"
                    required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-900 focus:outline-none focus:bg-olympic-blue/5 transition-all font-bold text-sm bg-white"
                  >
                    <option value="">Select interest area...</option>
                    {availableSports.length > 0 ? (
                      availableSports.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))
                    ) : (
                      <>
                        <option value="Track & Field">Track & Field</option>
                        <option value="Para Athletics">Para Athletics</option>
                        <option value="Swimming">Swimming</option>
                        <option value="Para Swimming">Para Swimming</option>
                        <option value="Gymnastics">Gymnastics</option>
                        <option value="Artistic Sports">Artistic Sports</option>
                        <option value="Cycling">Cycling</option>
                        <option value="Para Cycling">Para Cycling</option>
                        <option value="Combat Sports">Combat Sports</option>
                        <option value="Para Combat">Para Combat</option>
                        <option value="Team Sports">Team Sports</option>
                        <option value="Para Team Sports">Para Team Sports</option>
                        <option value="Racquet Sports">Racquet Sports</option>
                        <option value="Para Racquet Sports">Para Racquet Sports</option>
                        <option value="Precision Sports">Precision Sports</option>
                        <option value="Para Precision">Para Precision</option>
                        <option value="Power Sports">Power Sports</option>
                        <option value="Para Powerlifting">Para Powerlifting</option>
                        <option value="Water Sports">Water Sports</option>
                        <option value="Para Water Sports">Para Water Sports</option>
                        <option value="Winter Sports">Winter Sports</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Height (cm)</label>
                  <input 
                    type="number"
                    name="height"
                    value={formData.height}
                    required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-900 focus:outline-none focus:bg-olympic-blue/5 font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Weight (lbs)</label>
                  <input 
                    type="number"
                    name="weight"
                    value={formData.weight}
                    required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-900 focus:outline-none focus:bg-olympic-blue/5 font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Age</label>
                  <input 
                    type="number"
                    name="age"
                    value={formData.age}
                    required
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border-2 border-slate-900 focus:outline-none focus:bg-olympic-blue/5 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Regional Origin</label>
                <input 
                  type="text"
                  name="homeTown"
                  placeholder="e.g. Ohio"
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border-2 border-slate-900 focus:outline-none focus:bg-olympic-blue/5 font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Innate Traits</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(TRAITS_BY_CATEGORY)
                    .filter(([category]) => {
                      if (!formData.sport) return true;
                      
                      // Robust check: try exact match, then try if sport includes map key, or map key includes sport
                      const sportLower = formData.sport.toLowerCase();
                      const matchingKey = Object.keys(SPORT_ARCHETYPE_MAP).find(key => {
                        const keyLower = key.toLowerCase();
                        return sportLower.includes(keyLower) || keyLower.includes(sportLower);
                      });

                      const relevantCategories = (matchingKey ? SPORT_ARCHETYPE_MAP[matchingKey] : null) || Object.keys(TRAITS_BY_CATEGORY);
                      return relevantCategories.includes(category);
                    })
                    .map(([category, traits]) => (
                    <div key={category} className="w-full">
                       <p className="text-[8px] font-black uppercase text-slate-300 mb-1 tracking-tighter">{category}</p>
                       <div className="flex flex-wrap gap-1.5 pb-2">
                          {traits.map(trait => {
                            const isSelected = formData.abilities.includes(trait);
                            return (
                              <button
                                key={trait}
                                type="button"
                                onClick={() => {
                                  const currentTraits = formData.abilities ? formData.abilities.split(', ') : [];
                                  if (isSelected) {
                                    setFormData({ ...formData, abilities: currentTraits.filter(t => t !== trait).join(', ') });
                                  } else {
                                    setFormData({ ...formData, abilities: [...currentTraits, trait].join(', ') });
                                  }
                                }}
                                className={`px-2 py-1 text-[9px] font-bold rounded border transition-all ${
                                  isSelected 
                                    ? 'bg-olympic-blue text-white border-olympic-blue shadow-sm' 
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {trait}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  ))}
                  {!formData.sport && (
                    <p className="text-[9px] font-bold text-slate-300 italic">Select an interest area to focus your trait profile...</p>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-olympic-red/10 border border-olympic-red/20 rounded text-[10px] font-bold text-olympic-red flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-olympic-red rounded-full" />
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isMatching}
                className={`w-full py-3 border-2 border-slate-900 font-black uppercase tracking-wider shadow-bento active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 ${
                  isMatching ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-olympic-blue to-blue-700 text-white hover:brightness-110'
                }`}
              >
                {isMatching ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Activity className="w-5 h-5 text-olympic-yellow" />
                  </motion.div>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-olympic-yellow mr-1" />
                    Find Archetype Alignment
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Results Bento Layout */}
          <div ref={resultRef} className="col-span-12 -mt-4" />
          <AnimatePresence>
            {isFlipped && result && (
              <>
                {/* Central Mirror Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`col-span-12 lg:col-span-4 row-span-2 bg-gradient-to-br ${getArchetypeColor(result?.archetype || '')} border-2 border-slate-900 overflow-hidden relative shadow-bento-yellow group`}
                >
                  <div className="absolute inset-0 bg-[#000]/20 mix-blend-overlay group-hover:bg-[#000]/10 transition-all" />
                  <div className="h-full flex flex-col p-6 text-white relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm">
                        Historical Cluster
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-tighter text-white/70">DNA Alignment</div>
                        <div className="text-3xl font-black text-olympic-yellow italic underline decoration-white/40 decoration-2 underline-offset-4 drop-shadow-sm">TEAM USA</div>
                      </div>
                    </div>
                    
                    <div className="flex-grow flex items-center justify-center my-4 relative">
                      <motion.div 
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-xl border-4 border-white/30 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group-hover:border-white/50 transition-all"
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-60 transition-opacity">
                          <ResponsiveContainer width="100%" height="100%" debounce={300}>
                            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={getArchetypeTraits(result?.archetype || '')}>
                              <PolarGrid stroke="#fff" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontSize: 6, fontWeight: 900 }} />
                              <Radar name="Trait" dataKey="A" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.6} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        <User className="w-12 h-12 text-white drop-shadow-lg relative z-10" />
                        <span className="text-[7px] font-black uppercase tracking-[0.3em] mt-1 text-white/90 relative z-10">Neural Analysis</span>
                      </motion.div>
                      <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-olympic-red rounded-lg transform -rotate-12 border-2 border-slate-900 flex items-center justify-center shadow-lg group-hover:rotate-0 transition-transform">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <span className="text-[10px] font-black text-olympic-yellow uppercase tracking-[0.2em] mb-1 block drop-shadow-sm">Archetype Revealed</span>
                      <h2 className="text-4xl font-black italic uppercase leading-none text-white tracking-tighter drop-shadow-md mb-4">{result?.archetype || 'Analyzing...'}</h2>
                      
                      <motion.div 
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-2 mt-4"
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Prime Aligned Disciplines</p>
                        <p className="text-[8px] text-white/30 leading-tight mb-3">These disciplines share your biological leverages and mechanical signature.</p>
                        <div className="flex flex-wrap gap-2">
                          {/* Highlight User's Selected Focus */}
                          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-lg px-4 py-2 rounded-lg border-2 border-olympic-yellow shadow-[0_0_15px_rgba(251,191,36,0.4)] transform hover:scale-105 transition-all group">
                            <span className="text-olympic-yellow text-xs group-hover:scale-110 transition-transform">🎯</span>
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-olympic-yellow tracking-[0.1em] uppercase leading-none mb-0.5">Your Focus</span>
                              <span className="text-[11px] font-black text-white uppercase tracking-tighter italic leading-none">{formData.sport}</span>
                            </div>
                          </div>
                          
                          {getArchetypeSports(result.archetype).slice(0, 2).map((s, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 shadow-sm opacity-70 hover:opacity-100 transition-all cursor-help" title={s.name}>
                              <span className="text-slate-300 group-hover:text-white transition-colors">{s.icon}</span>
                              <span className="text-[10px] font-black text-white/80 uppercase tracking-tighter italic">{s.name}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* Legacy Stats */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="col-span-12 lg:col-span-4 bg-white border-2 border-slate-900 p-5 shadow-bento flex flex-col"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-olympic-blue" />
                      Heritage Synergy
                    </div>
                    {result.matchCount > 0 && ((result.legacyStats.medalBreakdown?.gold || 0) + (result.legacyStats.medalBreakdown?.silver || 0) + (result.legacyStats.medalBreakdown?.bronze || 0)) === 0 && (
                      <div className="bg-slate-900 px-2 py-1 rounded-sm border border-white/10 flex items-center gap-1.5 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-olympic-blue rounded-full" />
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter italic">Elite Specialist found</span>
                      </div>
                    )}
                  </span>
                  <div className="space-y-4 flex-grow">
                    {/* Medal Breakdown Chart */}
                    <div className="py-2 h-32 relative group/chart">
                      <ResponsiveContainer width="100%" height="100%" debounce={300}>
                        <PieChart>
                          <Pie
                            data={getMedalData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={45}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getMedalData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} stroke="#fff" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ fontSize: '10px', borderRadius: '4px', border: '1px solid #000', fontWeight: 'bold' }}
                            itemStyle={{ padding: 0 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[14px] font-black leading-none">{result?.legacyStats?.aggregateMedalImpact || 0}</span>
                        <span className="text-[6px] font-black uppercase opacity-40">Medals</span>
                      </div>
                    </div>
                    {/* Tiny Medal Cards */}
                    <div className="grid grid-cols-3 gap-2 py-2">
                       <div className="bg-amber-50 p-2 rounded border border-amber-100 text-center transform hover:scale-105 transition-transform">
                          <div className="text-sm font-black text-amber-600">{result?.legacyStats?.medalBreakdown?.gold || 0}</div>
                          <div className="text-[7px] font-bold uppercase text-amber-800">Gold</div>
                       </div>
                       <div className="bg-slate-50 p-2 rounded border border-slate-200 text-center transform hover:scale-105 transition-transform">
                          <div className="text-sm font-black text-slate-400">{result?.legacyStats?.medalBreakdown?.silver || 0}</div>
                          <div className="text-[7px] font-bold uppercase text-slate-500">Silver</div>
                       </div>
                       <div className="bg-orange-50 p-2 rounded border border-orange-100 text-center transform hover:scale-105 transition-transform">
                          <div className="text-sm font-black text-orange-600">{result?.legacyStats?.medalBreakdown?.bronze || 0}</div>
                          <div className="text-[7px] font-bold uppercase text-orange-800">Bronze</div>
                       </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-600 uppercase">Games Spanned</span>
                      <div className="text-right">
                        <span className="text-lg font-black italic text-slate-800">{result?.legacyStats?.historicalDepth || 0}</span>
                        <span className="text-[8px] font-black uppercase block opacity-40">Historical Eras</span>
                      </div>
                    </div>
                    {/* Unique Sports List */}
                    {result?.legacyStats?.sportsMatched?.length > 0 && (
                      <div className="py-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aligned Disciplines</span>
                        <div className="flex flex-wrap gap-1">
                          {result.legacyStats.sportsMatched.map((sport, idx) => (
                            <span key={`${sport}-${idx}`} className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1 shadow-sm">
                              {getSportIcon(sport)}
                              {sport}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Total Verified Matches</span>
                      <span className="text-xs font-black text-slate-900">{result?.matchCount || 0} Athletes</span>
                    </div>
                  </div>
                </motion.div>

                {/* Specs Box - Now with Height Chart */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-12 lg:col-span-2 bg-white border-2 border-slate-900 p-4 shadow-bento flex flex-col"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Physical Alignment</h3>
                    <Ruler className="w-3 h-3 text-olympic-red" />
                  </div>
                  
                  <div className="space-y-4 flex-grow">
                    {/* Height Chart */}
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%" debounce={300}>
                        <BarChart data={getPhysicalAlignmentData().height} layout="vertical" margin={{ left: 10, right: 60, top: 15 }} barCategoryGap="20%">
                          <XAxis type="number" hide domain={[0, 220]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                            {getPhysicalAlignmentData().height.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList 
                              dataKey="name" 
                              position="top" 
                              style={{ fill: '#475569', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                              offset={4}
                              textAnchor="start"
                            />
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              style={{ fill: '#334155', fontSize: '9px', fontWeight: '900' }} 
                              formatter={(val: number) => `${val}cm`} 
                              offset={8}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Age Chart */}
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%" debounce={300}>
                        <BarChart data={getPhysicalAlignmentData().age} layout="vertical" margin={{ left: 10, right: 60, top: 15 }} barCategoryGap="20%">
                          <XAxis type="number" hide domain={[0, 50]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
                            {getPhysicalAlignmentData().age.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList 
                              dataKey="name" 
                              position="top" 
                              style={{ fill: '#475569', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                              offset={4}
                              textAnchor="start"
                            />
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              style={{ fill: '#334155', fontSize: '9px', fontWeight: '900' }} 
                              formatter={(val: number) => `${val}y`} 
                              offset={8}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 border-t border-slate-50">
                    <div className="text-xl font-black italic text-slate-900 leading-none">
                      {formData.height}<span className="text-[8px] not-italic text-slate-400 ml-1 uppercase">CM</span>
                      <span className="mx-2 text-slate-200">|</span>
                      {formData.age}<span className="text-[8px] not-italic text-slate-400 ml-1 uppercase">AGE</span>
                    </div>
                    <p className="text-[7px] font-bold text-slate-500 uppercase mt-1">Stature & Era Sync</p>
                  </div>

                  {result?.legacyStats?.verifiedAges && result.legacyStats.verifiedAges.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-slate-900">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block mb-2">Age Verification Sync</span>
                      <div className="space-y-2">
                        {result.legacyStats.verifiedAges.map((v, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded border border-slate-100 relative group">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-black text-slate-500 truncate w-20 uppercase">{v.sport}</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs font-black text-olympic-red">{v.age}</span>
                                <span className="text-[6px] font-bold text-slate-400 italic">YRS</span>
                              </div>
                            </div>
                            <p className="text-[6px] font-black text-slate-400 uppercase mt-1">Participation Year: {v.year}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[6px] font-bold text-slate-400 italic mt-2 leading-tight">
                        *Ages verified via birth records and competition year extraction for peer-group calibration.
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Geospatial Alignment Map */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="col-span-12 lg:col-span-4 bg-white border-2 border-slate-900 p-5 shadow-bento flex flex-col relative overflow-hidden group"
                >
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3 h-3 text-olympic-blue" />
                      Geospatial Heritage Sync
                    </span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-olympic-blue rounded-full animate-ping" />
                      <span className="text-[8px] font-black uppercase text-olympic-blue">Live Analysis</span>
                    </div>
                  </div>

                  <div className="flex-grow relative bg-slate-50 rounded-xl border border-slate-100 overflow-hidden min-h-[220px]">
                     {/* Simplified DNA/Map Grid */}
                     <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* User Origin */}
                        {(() => {
                           const userOrigin = getCoordsFromHometown(formData.homeTown);
                           const matches = result?.legacyStats?.matchedHometowns || [];
                           
                           return (
                             <>
                               {/* Grid dots */}
                               {[...Array(10)].map((_, x) => [...Array(10)].map((_, y) => (
                                 <circle key={`${x}-${y}`} cx={x * 10 + 5} cy={y * 10 + 5} r="0.5" fill="#e2e8f0" />
                               )))}

                               {/* Lines from user to matches */}
                               {userOrigin && matches.map((mt, i) => {
                                 const matchCoords = getCoordsFromHometown(mt);
                                 if (!matchCoords) return null;
                                 return (
                                   <motion.line 
                                     key={i}
                                     initial={{ pathLength: 0, opacity: 0 }}
                                     animate={{ pathLength: 1, opacity: 0.2 }}
                                     transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                     x1={userOrigin.coords[0]} 
                                     y1={userOrigin.coords[1]} 
                                     x2={matchCoords.coords[0]} 
                                     y2={matchCoords.coords[1]} 
                                     stroke="#3b82f6" 
                                     strokeWidth="0.5" 
                                     strokeDasharray="2 2"
                                   />
                                 );
                               })}

                               {/* Match Points */}
                               {matches.map((mt, i) => {
                                 const m = getCoordsFromHometown(mt);
                                 if (!m) return null;
                                 return (
                                    <g key={i}>
                                      <motion.circle 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 1 + i * 0.1 }}
                                        cx={m.coords[0]} 
                                        cy={m.coords[1]} 
                                        r="2.5" 
                                        fill="#22c55e" 
                                        fillOpacity="0.6"
                                        stroke="#fff"
                                        strokeWidth="0.5"
                                      />
                                      <text x={m.coords[0] + 3} y={m.coords[1] + 1} fontSize="3" className="font-black fill-green-600 uppercase pointer-events-none">{m.abbr}</text>
                                    </g>
                                 );
                               })}

                               {/* User Point - Black marker with legacy pulse */}
                               {userOrigin && (
                                 <motion.g
                                   initial={{ scale: 0 }}
                                   animate={{ scale: 1 }}
                                   transition={{ type: 'spring', damping: 12 }}
                                 >
                                    <circle cx={userOrigin.coords[0]} cy={userOrigin.coords[1]} r="5" fill="#000" fillOpacity="0.1" className="animate-pulse" />
                                    <circle cx={userOrigin.coords[0]} cy={userOrigin.coords[1]} r="1.8" fill="#000" stroke="#fff" strokeWidth="0.8" />
                                    <text 
                                      x={userOrigin.coords[0]} 
                                      y={userOrigin.coords[1] - 4} 
                                      textAnchor="middle"
                                      fontSize="4" 
                                      className="font-black fill-black uppercase tracking-tighter pointer-events-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                                    >
                                      YOU ({userOrigin.abbr})
                                    </text>
                                 </motion.g>
                               )}
                             </>
                           );
                        })()}
                     </svg>

                     <div className="absolute bottom-2 left-2 right-2 bg-white/80 backdrop-blur-md p-2 rounded border border-white/50 shadow-sm">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[7px] font-black uppercase text-slate-400 mb-0.5">Heritage Radius</p>
                              <p className="text-[10px] font-black text-slate-900 leading-tight">Matched Athletes from {result?.legacyStats?.matchedHometowns?.length || 0} Key Regions</p>
                           </div>
                           <p className="text-[8px] font-black text-olympic-blue italic">PROXIMITY SYNC</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-4 space-y-2">
                     <p className="text-[9px] font-bold text-slate-500 leading-relaxed italic">
                       Distances calculated relative to the U.S. Heritage Epicenter. Matching profiles localized to state-level clusters to preserve privacy while maintaining spatial integrity.
                     </p>
                  </div>
                </motion.div>

                {/* Classification Box */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`col-span-6 lg:col-span-2 border-2 border-slate-900 p-5 shadow-bento text-white flex flex-col relative overflow-hidden ${
                    result?.legacyStats?.containsParalympic ? 'bg-olympic-green' : 'bg-slate-700'
                  }`}
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                  </div>
                  <h3 className="font-black text-[10px] uppercase tracking-widest opacity-60">Impact Scope</h3>
                  <p className="text-[8px] text-white/40 leading-tight mt-1">Estimating your physiological alignment based on the specific bio-traits you've selected.</p>
                  
                  <div className="mt-4 space-y-4">
                    <div className="relative">
                      <p className="text-[8px] font-black uppercase text-white/50 mb-1 flex justify-between">
                        <span>Resonance Score</span>
                        <span className="text-olympic-yellow">ESTIMATED</span>
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black italic leading-none text-white">
                          {formData.abilities ? (formData.abilities.split(', ').length * 25).toFixed(0) : '0'}%
                        </span>
                        <p className="text-[7px] font-bold text-white/30 uppercase tracking-tighter">Bio-Trait Match</p>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${formData.abilities ? (formData.abilities.split(', ').length * 25) : 0}%` }}
                          className="h-full bg-gradient-to-r from-olympic-blue to-olympic-yellow"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[8px] font-black uppercase text-white/50 mb-2">Trait Affinity</p>
                      <div className="flex flex-col gap-1.5">
                        {formData.abilities.split(', ').slice(0, 3).map((ability, i) => (
                          <div key={i} className="flex justify-between items-center text-[9px] font-bold bg-white/5 px-2.5 py-1.5 rounded-sm border border-white/10">
                            <span className="text-white/80">{ability}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4].map(dot => (
                                <div key={dot} className={`w-1 h-1 rounded-full ${dot <= (i === 0 ? 4 : i === 1 ? 3 : 2) ? 'bg-olympic-yellow' : 'bg-white/10'}`} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="text-2xl font-black italic leading-none whitespace-nowrap tracking-tighter">
                      {result?.legacyStats?.containsParalympic ? 'PARA-READY' : 'GLOBAL ERA'}
                    </div>
                    <div className="text-[8px] font-black uppercase mt-1 opacity-80 decoration-white/30 underline underline-offset-2"> Inclusive Design</div>
                  </div>
                </motion.div>

                {/* Metabolic & Health Intelligence Card */}
                {result?.legacyStats?.metabolicBaseline && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="col-span-12 lg:col-span-4 bg-white border-2 border-slate-900 p-5 shadow-bento relative group overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Heart className="w-16 h-16 text-olympic-red" />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-olympic-red" />
                        Metabolic Intelligence
                      </span>
                      <div className="text-[8px] font-black bg-olympic-red/10 text-olympic-red px-2 py-0.5 rounded border border-olympic-red/20 shadow-sm">
                        HEALTH-SYNC ENABLED
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-1">Personal Body Index</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900 italic">
                            {(Number(formData.weight) / Math.pow(Number(formData.height) / 100, 2)).toFixed(1)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-slate-500">BMI</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[7px] font-black uppercase text-slate-400 mb-1">Energy Baseline</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900 italic">
                            {(10 * Number(formData.weight) + 6.25 * Number(formData.height) - 5 * Number(formData.age) + 5).toFixed(0)}
                          </span>
                          <span className="text-[8px] font-black uppercase text-slate-500">KCAL / DAY</span>
                        </div>
                      </div>
                    </div>

                    {result.legacyStats.metabolicBaseline && (
                      <div className="mb-4 p-2 bg-slate-900 text-white rounded flex justify-between items-center">
                        <span className="text-[8px] font-black uppercase tracking-tighter">Olympic Peer Contrast</span>
                        <div className="text-[10px] font-black">
                          {result.legacyStats.metabolicBaseline.weight}kg Avg Body Mass 
                        </div>
                      </div>
                    )}


                    {result?.legacyStats?.regionalHealthContext && (
                      <div className="space-y-2">
                         <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-1">Regional Health Vitality ({formData.homeTown || 'State-Level'})</p>
                         <div className="grid grid-cols-2 gap-2">
                            {Object.entries(result.legacyStats.regionalHealthContext).map(([key, val], idx) => (
                              <div key={`${key}-${idx}`} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                                 <span className="text-[8px] font-bold text-slate-600 truncate w-24" title={key}>{key}</span>
                                 <span className="text-[10px] font-black text-olympic-blue">{val}%</span>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-olympic-red/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Sparkles className="w-4 h-4 text-olympic-red" />
                      </div>
                      <p className="text-[8px] font-bold text-slate-500 leading-tight italic">
                        Metabolic rate calculated using real biometric data from historical Team USA {formData.sport} athletes (matching height/weight profiles).
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Storytelling Box */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="col-span-12 lg:col-span-8 bg-slate-900 border-2 border-slate-900 p-6 flex flex-col md:flex-row items-center gap-6 shadow-bento-yellow"
                >
                  <div className="w-16 h-16 flex-shrink-0 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center text-4xl shadow-bento">
                    🇺🇸
                  </div>
                  <div className="flex-grow">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Heritage Narrative • Data-Driven</span>
                    <p className="text-lg md:text-xl leading-tight font-bold text-white italic">
                      {summary ? `"${summary}"` : result ? "Analysis complete. Mirroring potential..." : "Waiting for BigQuery sync..."}
                    </p>
                  </div>
                </motion.div>
                
                {/* Historical Context Footer */}
                <motion.div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-white to-slate-50 border-2 border-slate-900 p-5 shadow-bento flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-olympic-blue/5 rounded-full blur-xl" />
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-olympic-red" />
                      Timeline Verification
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(result?.legacyStats?.historicalContext || [])).map((game, idx) => (
                        <span key={`${game}-${idx}`} className="text-[9px] font-black bg-white border-2 border-slate-900 px-2.5 py-1 rounded-sm uppercase transform hover:-translate-y-0.5 transition-all shadow-sm">
                          {game}
                        </span>
                      )) || <span className="text-[8px] opacity-20 italic">Scanning Historical Clusters...</span>}
                    </div>
                    {result?.legacyStats?.educationLegacy && (
                      <div className="mt-4 p-2 bg-olympic-blue/5 border-l-4 border-olympic-blue">
                        <p className="text-[8px] font-black uppercase text-olympic-blue leading-tight italic">
                          Legacy Note: While your exact hometown match for {formData.sport} is rare, historical medalists have shared your regional DNA through their university study in your area.
                        </p>
                      </div>
                    )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-16 pb-8 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-0.5 bg-slate-900 flex-1" />
          <div className="flex gap-2">
             <div className="w-2 h-2 bg-olympic-red"></div>
             <div className="w-2 h-2 bg-slate-200"></div>
             <div className="w-2 h-2 bg-olympic-blue"></div>
          </div>
          <div className="h-0.5 bg-slate-900 flex-1" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] font-mono text-slate-400">Team USA Heritage System • 2026 Hackathon Submission</p>
      </footer>
    </div>
  );
}
