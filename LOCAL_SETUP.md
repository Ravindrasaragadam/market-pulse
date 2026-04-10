# Local One-Time Setup Guide

Run these steps **ONCE** on your local laptop to initialize the database. This replaces the heavy processing that used to run in GitHub Actions.

---

## Prerequisites

```bash
# Install Python 3.9+ if not already installed
python --version  # Should show 3.9 or higher

# Navigate to backend directory
cd platform_backend

# Install dependencies (lightweight)
pip install -r requirements.txt
```

---

## Step 1: Configure Environment

Create `.env` file in `platform_backend/`:

```bash
# Supabase credentials (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key

# Optional: For one-time AI processing (if you want initial analysis)
NVIDIA_NIM_API_KEY=your-nvidia-api-key
```

**Get these from:**
- Supabase: https://app.supabase.com/project/_/settings/api
- NVIDIA NIM: https://build.nvidia.com

---

## Step 2: Run Database Migrations

**Manually run these SQL files in Supabase SQL Editor:**

1. Go to: https://app.supabase.com/project/_/sql
2. Run files in order:
   - `supabase/schema.sql`
   - `supabase/migrations/001_add_sent_news_table.sql`
   - `supabase/migrations/002_add_stock_signals_fields.sql`
   - `supabase/migrations/003_add_dynamic_focus_areas.sql`
   - `supabase/migrations/004_create_stock_symbols_table.sql`
   - `supabase/migrations/005_add_stock_alerts_view.sql`

---

## Step 3: Run Local Setup Script

This populates stocks, watchlist, and sample data:

```bash
cd platform_backend
python local_setup.py
```

**What it does:**
- ✅ Inserts 20 Indian stocks (NSE)
- ✅ Inserts 10 US stocks (NYSE/NASDAQ)
- ✅ Creates default watchlist (10 India + 5 US)
- ✅ Seeds sample market alerts

**Output:**
```
Connected to Supabase
Populating stock symbols...
Inserted 30 stocks
Creating default watchlist...
Created watchlist with 10 stocks
Seeding sample alerts...
Created 2 sample alerts
Setup complete!
```

---

## Step 4: Verify in Supabase

Check data was inserted:

```sql
-- Check stocks
SELECT count(*) FROM stock_symbols;
-- Should show: 30

-- Check watchlist
SELECT * FROM user_watchlist LIMIT 5;

-- Check alerts
SELECT * FROM alerts ORDER BY created_at DESC LIMIT 5;
```

---

## Step 5: Deploy Dashboard

Now deploy the self-serving dashboard:

```bash
cd platform_dashboard

# Install dependencies
npm install

# Set environment variables
cp env.example .env.local
# Edit .env.local with your Supabase credentials

# Build and deploy to Vercel
npm run build
vercel --prod
```

**Required env vars for dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NVIDIA_NIM_API_KEY` (for AI analysis)

---

## Step 6: Configure GitHub Actions (Optional)

For lightweight alerts only:

1. Go to GitHub repo → Settings → Secrets → Actions
2. Add these secrets:
   ```
   SUPABASE_URL
   SUPABASE_KEY
   WATCHLIST_SYMBOLS=RELIANCE.NS,TCS.NS,INFY.NS,AAPL,MSFT
   FOCUS_KEYWORDS=Synbio,AI,Gold,Semiconductors
   WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
   ```

3. GitHub Actions will now run every 15 minutes, polling news only.

---

## When to Re-Run Local Setup

**Run again only when:**
- Adding major new stock sectors (e.g., new IPOs, new market)
- Schema changes requiring data migration
- Bulk watchlist updates
- Initial deployment to new environment

**DO NOT run regularly** - this is one-time initialization.

---

## Architecture After Setup

```
Your Laptop (One-time only)
  └── Initial data population

GitHub Actions (Every 15 min)
  └── News polling → Alerts

Vercel Dashboard (Always on)
  └── Real-time prices, news, AI analysis
```

---

## Troubleshooting

**"Supabase credentials not configured"**
- Check `.env` file exists in `platform_backend/`
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set

**"Table doesn't exist"**
- Run SQL migrations in Supabase first (Step 2)

**"Duplicate key error"**
- Script uses `upsert`, so safe to re-run
- Or clear tables: `TRUNCATE stock_symbols, user_watchlist;`

---

Done! Your dashboard is now self-serving with real-time data.
