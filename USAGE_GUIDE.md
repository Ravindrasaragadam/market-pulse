# Antigravity Pulse: Usage & Configuration Guide 🚀

Welcome to your specialized Market Intelligence Platform. This guide will help you set up, calibrate, and deploy your scanner for maximum efficiency.

---

## 🏗️ 1. Setup & Installation

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** (for the Dashboard)
- **Supabase Account** (Free Tier)
- **NVIDIA NIM API Key** (from Build.NVIDIA.com)

### Installation
1. **Clone & Install Backend**:
   ```bash
   cd platform_backend
   pip install -r requirements.txt
   ```
2. **Setup Dashboard**:
   ```bash
   cd platform_dashboard
   npm install
   ```
3. **Configure Environment**:
   Copy `.env.example` to `.env` in the `platform_backend` folder and fill in your credentials.

---

## 🎯 2. Calibration (Adding Stocks & Sectors)

The platform is pre-calibrated for **Synbio, SMR, AI Infrastructure, Gold, and Silver**.

### Adding New Stocks
To add more stocks, update the `WATCHLIST_SYMBOLS` in your `.env`:
- **Indian Stocks**: Use simple codes like `RELIANCE`, `TCS`. (The system adds `.NS` automatically).
- **US Stocks**: Use `NVDA`, `TSLA`, `SMR`.
- **Commodities**: Use Yahoo Finance codes like `GC=F` (Gold) or `SI=F` (Silver).

### Updating Focus Keywords
To shift the AI's attention to new trends, update `FOCUS_KEYWORDS`:
```env
FOCUS_KEYWORDS=Quantum Computing, Solid State Batteries, Hyperscale Cooling
```

---

## 🤖 3. Using the Monitor

### Periodic Mode
The system runs a **Market Review** every 30 minutes (configurable via `EVALUATION_INTERVAL_MINS`).
- Scans news headlines.
- Checks watchlist for "Big Moves" (>2%).
- Alerts you via Telegram if something critical is found.

### Manual Scan (Mid-day Review)
You can trigger a manual scan anytime by sending the command:
**`/scan`**
to your Telegram Bot. The bot will instantly perform research and return a signal.

### Chart Analysis
Send any **screenshot of a chart** to your monitored Telegram channel. The AI will:
1. Detect the image.
2. Analyze the technical patterns using Llama 3.2 Vision.
3. Post the analysis and a BUY/SELL signal to your Alert Bot.

---

## 🌐 4. Hosting & Deployment (Zero Cost)

### Backend: Render (Free Tier)
1. Create a **Background Worker** on [Render.com](https://render.com).
2. Connect your GitHub Repo.
3. Set **Start Command**: `python -m platform_backend.monitor`.
4. Add all variables from your `.env` to the Render **Environment Variables** section.

### Frontend: Vercel (Free Tier)
1. Import your repo into [Vercel](https://vercel.com).
2. Set the root directory to `platform_dashboard`.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel's Environment Variables.

---

## 📈 5. Monitoring Trends (Dashboard)
Your dashboard at `your-app.vercel.app` provides:
- **Live Tape**: Real-time price updates for high-level indices.
- **Signal History**: Persistent log of every AI analysis stored in Supabase.
- **Sentiment Score**: A top-down view of how bullish or bearish the news cycle is.

---

> [!NOTE]
> **Data Privacy**: All analysis is stored in your private Supabase instance.
> **Credit Optimization**: The 30-minute interval is designed to keep you within the free credits of NVIDIA NIM while maintaining real-time awareness.
