# ContentHarvest

ContentHarvest is an AI-powered content intelligence platform that helps you monitor competitors, analyze content performance, discover trends, and optimize your content strategy in real time.

## Features

- **Unified Intelligence Dashboard:**  
  View real-time analytics, competitor insights, asset tracking, and trend discovery in one place.

- **Smart Competitor Analysis:**  
  Automatically scrape competitor websites, identify content gaps, and get trending topic recommendations.

- **Content Performance Predictor:**  
  Predict how well your content will perform using AI-driven analysis.

- **Trend Discovery:**  
  Stay ahead with real-time market and content trends.

- **Assets:**  
  Track and manage content assets (articles, videos, PDFs, posts) with simple ingestion (manual/RSS/webhooks), key metadata, and APIs (`GET/POST/PATCH /api/assets`).

- **Seamless Integrations:**  
  Connect with popular CMS, social media, and analytics tools.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/contentharvest.git
cd contentharvest
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

### 3. Set Up Environment Variables

- Copy the `.env.example` file in the `backend` folder to `.env` and fill in your API keys and configuration.

### 4. Run the Project

#### Start the Backend

```bash
cd backend
npm start
```

#### Start the Frontend

Open a new terminal window:

```bash
cd frontend
npm start
```

The frontend will run on [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
contentharvest/
├── backend/      # Node.js/Express backend (APIs, scraping, analysis)
├── frontend/     # React frontend (dashboard, UI)
└── README.md
```

---
## How It Works

- **Dashboard:**  
  See a unified view of your competitors, assets, trends, and predictions.  
  ![Dashboard Screenshot](./screenshots/dashboard.png)

- **Competitor Analysis:**  
  Add competitor websites. The system scrapes their content, analyzes strategies, and highlights gaps and trending topics.

- **Content Insights:**  
  Paste your content to get AI-powered performance predictions and optimization tips.

- **Assets:**  
  Track and manage all content assets (articles, blogs, videos, PDFs, social posts) in one place.
  - Ingestion: manual add, sitemap/RSS, CMS webhooks.
  - Metadata: title, URL, owner, channel, tags, topics, stage, publish date.
  - Tracking: performance metrics (views, CTR, shares), canonical mapping, deduplication.
  - Actions: tag, archive, link to campaigns, assign owner, set review date.
  - Versioning: keep edit history and diffs.
  - UI: filter/search, saved views, bulk actions, CSV export.
  - API (examples): `GET /api/assets`, `POST /api/assets`, `PATCH /api/assets/:id`.
   
---

## Requirements

- Node.js (v16+ recommended)
- npm

