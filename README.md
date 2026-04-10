# Market Pulse: Market Intelligence Platform 🚀

**AI-Powered Market Analysis for Indian & US Markets**

Market Pulse is a lightweight, zero-cost market intelligence suite with a self-serving dashboard and a minimal alert service. The dashboard fetches real-time prices and news directly, while GitHub Actions handles only lightweight news polling for alerts.

## 🌟 Key Features

- **Real-Time Dashboard**: Fetches live prices from Yahoo Finance, news from RSS feeds
- **AI-Powered Signals**: Direct NVIDIA NIM integration for on-demand stock analysis
- **Multi-Market Support**: Separate tabs for Indian (NSE/BSE) and US markets
- **Live News Feed**: Real-time news from Economic Times, MoneyControl, Yahoo Finance
- **Lightweight Alerts**: GitHub Actions polls news every 15 minutes, sends notifications
- **Self-Serving Architecture**: Dashboard works independently, no backend dependency
- **Price Auto-Refresh**: Updates every 60 seconds while you browse
- **Client-Side AI**: Analysis calls go directly from browser to NVIDIA NIM
- **Zero Telegram Dependency**: Simple webhook/email alerts, no complex session management

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **Supabase Account** (Free tier works)
- **NVIDIA NIM API Key** (from [build.nvidia.com](https://build.nvidia.com))
- **Optional: Webhook URL or Email** (for alerts only)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd market-pulse
```

### 2. Backend Setup (Optional)

The backend is **only needed for GitHub Actions alerts**. The dashboard is fully self-serving.

```bash
cd platform_backend
pip install -r requirements.txt  # Lightweight dependencies only

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials (only needed for alerts)
```

### 3. Dashboard Setup

```bash
cd platform_dashboard
npm install

# Copy and configure environment
cp env.example .env.local
# Edit .env.local with your credentials
```

### 4. Database Setup

Run the migrations in Supabase SQL Editor (in order):
1. `supabase/schema.sql`
2. `supabase/migrations/001_add_sent_news_table.sql`
3. `supabase/migrations/002_add_stock_signals_fields.sql`
4. `supabase/migrations/003_add_dynamic_focus_areas.sql`
5. `supabase/migrations/004_create_stock_symbols_table.sql`
6. `supabase/migrations/005_add_stock_alerts_view.sql`

### 5. Run Locally

**Dashboard (self-serving):**
```bash
cd platform_dashboard
npm run dev
```

**Backend (only for testing alerts):**
```bash
cd platform_backend
python -m platform_backend.alert_service
```

See **[Usage Guide](USAGE_GUIDE.md)** for detailed setup and calibration instructions.

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase database credentials | Yes |
| `WATCHLIST_SYMBOLS` | Comma-separated stock symbols | Optional |
| `FOCUS_KEYWORDS` | Comma-separated keywords | Optional |
| `WEBHOOK_URL` | URL for alert webhooks | Optional |
| `EMAIL_SMTP_SERVER` | SMTP server for email alerts | Optional |
| `EMAIL_FROM` | Sender email address | Optional |
| `EMAIL_TO` | Recipient email address | Optional |

### Alert System (Lightweight)

The alert service is minimal and fast:

- **News Polling**: Checks RSS feeds every 15 minutes
- **Signal Detection**: Keyword-based matching (no heavy AI)
- **Alert Channels**: Webhook, Email, or both
- **No Telegram**: Simplified architecture without session management

### Dashboard Self-Sufficiency

The dashboard fetches everything live:

| Feature | Source | Refresh |
|---------|--------|---------|
| Stock Prices | Yahoo Finance API | Every 60 seconds |
| News | RSS Feeds | Every 5 minutes |
| AI Analysis | NVIDIA NIM (browser → API) | On-demand |
| Watchlist | Supabase | On load + manual refresh |
| Charts | TradingView Widgets | Real-time |

### Dashboard Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `NVIDIA_NIM_API_KEY` | For AI analysis API | Optional |

### AI Model Configuration

Dashboard calls NVIDIA NIM directly from browser:

| Task | Model | Purpose |
|------|-------|---------|
| Stock Analysis | `meta/llama-3.1-405b-instruct` | Financial analysis |

## � Project Structure

```
market-pulse/
├── platform_backend/           # Python monitoring & analysis engine
│   ├── monitor.py             # Main orchestrator
│   ├── researcher.py           # Data collection (news, prices)
│   ├── brain.py                # AI analysis with NVIDIA NIM
│   ├── database.py             # Supabase operations
│   ├── config.py               # Configuration management
│   └── alerts/                 # Alert providers
│       ├── alert_manager.py    # Central alert dispatcher
│       └── providers/
│           ├── telegram_provider.py
│           ├── whatsapp_provider.py (stub)
│           ├── email_provider.py (stub)
│           └── queue_provider.py (stub)
│
├── platform_dashboard/         # Next.js web dashboard
│   ├── app/                   # Next.js app router
│   │   ├── api/               # API routes
│   │   ├── stock/[symbol]/    # Stock detail page
│   │   └── page.tsx           # Main dashboard
│   ├── components/            # React components
│   │   ├── StockSearch.tsx    # Stock search & add
│   │   ├── StockGrid.tsx      # Watchlist grid
│   │   ├── AIAnalyzer.tsx     # AI analysis popup
│   │   ├── StockAlerts.tsx    # Alert display
│   │   └── ...
│   └── lib/supabase.ts        # Supabase client
│
├── supabase/                   # Database schema & migrations
│   ├── schema.sql              # Base schema
│   └── migrations/             # Versioned migrations
│       ├── 001_add_sent_news_table.sql
│       ├── 002_add_stock_signals_fields.sql
│       ├── 003_add_dynamic_focus_areas.sql
│       ├── 004_create_stock_symbols_table.sql
│       └── 005_add_stock_alerts_view.sql
│
└── .github/workflows/          # CI/CD automation
    └── deploy.yml              # GitHub Actions workflow
```

## 🌐 Deployment

### GitHub Actions (Lightweight Alerts Only)

The new alert service runs every 15 minutes (not 60), processing only news:

1. Add secrets to GitHub (Settings → Secrets → Actions):
   - `SUPABASE_URL`, `SUPABASE_KEY`
   - `WATCHLIST_SYMBOLS`, `FOCUS_KEYWORDS`
   - `WEBHOOK_URL` or email credentials (optional)

2. Workflow runs automatically every 15 minutes

3. Manual trigger: Go to Actions tab → "Market Pulse Scanner" → Run workflow

### Vercel (Dashboard - Self-Serving)

1. Go to [vercel.com](https://vercel.com)
2. Add New Project → Import Git repo
3. Framework: Next.js, Root Directory: `platform_dashboard`
4. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NVIDIA_NIM_API_KEY`
5. Deploy - the dashboard works independently!

## 🛠️ Troubleshooting

### Common Issues

**Build fails with "supabaseUrl is required"**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server after adding env vars

**No stock prices showing**
- Dashboard fetches prices directly from Yahoo Finance
- Check browser console for API errors
- Yahoo Finance API may have rate limits

**News not loading**
- Dashboard fetches from RSS feeds directly
- Some networks may block RSS feeds
- Check browser console for CORS errors

**AI Analysis not working**
- Verify `NVIDIA_NIM_API_KEY` in dashboard env
- Check browser console for API errors
- Rate limiting: 5 requests per minute per user

## 📝 API Reference

### Dashboard REST Endpoints (Self-Serving)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stocks/search?q={query}` | GET | Search stocks by symbol/name |
| `/api/watchlist` | GET | Get user's watchlist with alerts |
| `/api/watchlist/add` | POST | Add stock to watchlist |
| `/api/ai-analyze` | POST | Get AI analysis (calls NVIDIA NIM) |
| `/api/prices/live?symbols=A,B` | GET | Real-time prices from Yahoo Finance |
| `/api/news/live?market=india` | GET | Live news from RSS feeds |
| `/api/commodities` | GET | Get commodities data |

### Alert Service (GitHub Actions)

The `alert_service.py` polls news sources and sends alerts:
- Runs every 15 minutes via GitHub Actions
- Checks Economic Times, MoneyControl, Yahoo Finance RSS
- Keyword-based signal detection
- Saves alerts to Supabase
- Sends webhook/email notifications

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

*For detailed setup and calibration, see [USAGE_GUIDE.md](USAGE_GUIDE.md)*
