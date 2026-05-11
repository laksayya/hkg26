# Team USA Archetype Agent

**The Team USA Archetype Agent** is an AI-driven experience that connects biometric identity to 120 years of Olympic and Paralympic legacy. Discover which athletic archetype you embody based on data collected from [Team USA](https://www.teamusa.com).

## 💡 Inspiration
Following a successful app built with Firebase for last year's hackathon, I wanted to explore the power of "vibe coding" using Google AI Studio. This project was born from a curiosity to see how effectively an AI agent could integrate historical sports data with real-time biometric analysis to create a personalized fan experience.

## ✨ What it does
The app acts as a digital mirror. By inputting physical traits and strengths, fans are matched against a dataset of Team USA athletes spanning over a century. It uses Gemini to interpret these traits into one of five distinct archetypes (e.g., "The Tactical Strategist" or "The Endurance Engine") and visualizes the match through neural trait maps and geospatial legacy tracking.

## 🛠 How I built it
This was a pure "vibe coding" weekend project. I started with a core concept and iteratively refined the architecture through conversation with Gemini in AI Studio. 
- **Backend:** A Node/Express server connecting to a BigQuery dataset containing cleaned Team USA historical data.
- **AI:** Gemini 3.1 Flash-Lite handles the high-speed "Archetype Matching" and personality interpretation.
- **Frontend:** Built with React, Tailwind CSS, and Framer Motion for a cinematic, high-performance UI.

## 🚧 Challenges I ran into
Finding the right dataset was the biggest hurdle. I spent significant time scraping and cleaning data from the Team USA site. Even then, the data was sparser than expected, requiring the AI to handle "missing links" in athlete biometric history intelligently.

## 🏆 Accomplishments that I'm proud of
I am proud to say that I finished this entire application without writing a single line of manual code. Gemini successfully captured my intent, handled complex BigQuery integrations, and implemented a robust Basic Auth system entirely through natural language feedback and iteration.

## 📚 What I learned
AI Studio is a game-changer for rapid prototyping. I learned that while the AI handles the "how," the developer's role shifts to "architect"—defining the data relationships, GCP permissions, and deployment strategy. Understanding the GCP ecosystem (BigQuery, Cloud Run) remains crucial for turning an AI concept into a production-ready tool.

## 🔮 What's next
I plan to enhance the matcher with metabolic rate analysis and expanded Paralympic category depth once I source higher-quality, more granular biometric datasets.

---

## 🧪 Reproducible Testing

To run this project locally or in your own environment, follow these steps:

### 1. Prerequisites
- Node.js (v18+)
- A Google Cloud Project with BigQuery enabled.
- Gemini API Key from Google AI Studio.

### 2. Environment Setup
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# AI & Data
GEMINI_API_KEY="your_gemini_api_key"
BIGQUERY_DATASET="your_dataset_name"
BIGQUERY_TABLE="your_table_name"
BIGQUERY_SERVICE_ACCOUNT_JSON='{"your_service_account_json_content"}'

# Access Control
APP_USERNAME="your_chosen_username"
APP_PASSWORD="your_chosen_password"
```

### 3. Installation & Execution
```bash
npm install
npm run dev
```

### 4. Verification
1. Open the app at `http://localhost:3000`.
2. Enter the `APP_USERNAME` and `APP_PASSWORD` when prompted by the browser (Basic Auth).
3. Select a sport and input biometric data to ensure the BigQuery + Gemini pipeline is responding correctly.

---

## License
Licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
