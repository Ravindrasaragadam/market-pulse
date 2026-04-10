# Market Pulse: Market Intelligence Platform 🚀

**AI-Powered Market Analysis for Indian & US Markets**

Market Pulse is a specialized, zero-cost market intelligence suite that monitors financial markets across Telegram channels and news sources. It uses **NVIDIA NIM (Llama 3.1/Nemotron)** for multi-modal analysis and **Supabase** for persistent data storage with self-learning capabilities.

## 🌟 Key Features

- **Smart Market Monitoring**: Real-time Telegram listener for chart screenshots and news aggregation
- **AI-Powered Signals**: BUY/SELL/NEUTRAL suggestions with confidence scores
- **Multi-Market Support**: Separate analysis for Indian (NSE/BSE) and US markets
- **Dynamic Watchlists**: Auto-populated based on focus areas and market trends
- **Smart Model Selection**: Uses appropriate NVIDIA NIM models for different tasks
- **Real-Time Dashboard**: Premium Next.js interface with watchlist management
- **Multi-Channel Alerts**: Telegram (fully functional), WhatsApp/Email/Message Queue (extensible)
- **AI Analysis Caching**: Persistent AI summaries with localStorage caching
- **Stop Loss & Target Tracking**: AI-extracted levels for each signal
- **Focus Area Management**: Dynamic focus areas that adapt to market conditions

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **Supabase Account** (Free tier works)
- **NVIDIA NIM API Key** (from [build.nvidia.com](https://build.nvidia.com))
- **Telegram API credentials** (for monitoring)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd market-pulse
```

### 2. Backend Setup

```bash
cd platform_backend
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials
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

**Backend:**
```bash
cd platform_backend
python -m platform_backend.monitor
```

**Dashboard:**
```bash
cd platform_dashboard
npm run dev
```

See **[Usage Guide](USAGE_GUIDE.md)** for detailed setup and calibration instructions.

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVIDIA_NIM_API_KEY` | API key for NVIDIA NIM LLM service | Yes |
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase database credentials | Yes |
| `TELEGRAM_API_ID` | From my.telegram.org | Yes |
| `TELEGRAM_API_HASH` | From my.telegram.org | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts | Yes |
| `TELEGRAM_ALERT_CHAT_ID` | Chat ID for Telegram alerts | Yes |
| `TELEGRAM_ALLOWED_CHATS` | Channels to monitor | Yes |
| `WATCHLIST_SYMBOLS` | Comma-separated stock symbols | Optional |
| `FOCUS_KEYWORDS` | Comma-separated keywords | Optional |
| `EVALUATION_INTERVAL_MINS` | Scan interval (default: 30) | Optional |
| `INCLUDE_INTERNATIONAL` | Enable US markets (default: True) | Optional |

### Dashboard Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `NVIDIA_NIM_API_KEY` | For AI analysis API | Optional |

### AI Model Configuration

Different NVIDIA NIM models are used for different tasks:

| Task | Model | Purpose |
|------|-------|---------|
| Market Summary | `meta/llama-3.1-405b-instruct` | Complex reasoning |
| Stock Analysis | `nvidia/nemotron-4-340b-instruct` | Financial analysis |
| Signal Extraction | `meta/llama-3.1-8b-instruct` | Fast structured output |
| News Summarization | `google/gemma-2-9b-it` | Quick summarization |

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

### GitHub Actions (Free Serverless)

1. Add all secrets to GitHub (Settings → Secrets → Actions):
   - All environment variables from `.env`
   - `TELEGRAM_STRING_SESSION` (generate with `python -c "from telethon..."`)

2. Workflow runs automatically every 60 minutes

3. Manual trigger: Go to Actions tab → "Market Pulse Scanner" → Run workflow

### Render (Free Tier - Backend)

1. Create Background Worker on [render.com](https://render.com)
2. Connect GitHub repo
3. Set Start Command: `python -m platform_backend.monitor`
4. Add all variables from `.env`

### Vercel (Free Tier - Frontend)

1. Go to [vercel.com](https://vercel.com)
2. Add New Project → Import Git repo
3. Framework: Next.js, Root Directory: `platform_dashboard`
4. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🛠️ Troubleshooting

### Common Issues

**Build fails with "supabaseUrl is required"**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server after adding env vars

**Telegram not receiving messages**
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALERT_CHAT_ID`
- Check bot is added to target chat

**No stock data showing**
- Run migration `004_create_stock_symbols_table.sql`
- Check `WATCHLIST_SYMBOLS` is configured

**NVIDIA NIM API errors**
- Verify API key at [build.nvidia.com](https://build.nvidia.com)
- Check rate limits on your NVIDIA account

## 📝 API Reference

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stocks/search?q={query}` | GET | Search stocks by symbol/name |
| `/api/watchlist` | GET | Get user's watchlist with alerts |
| `/api/watchlist/add` | POST | Add stock to watchlist |
| `/api/ai-analyze` | POST | Get AI analysis for symbol |
| `/api/commodities` | GET | Get commodities data |

### Supabase Functions

| Function | Description |
|----------|-------------|
| `search_stocks(query)` | Full-text search on stock symbols |
| `get_latest_stock_alerts(market, limit)` | Get recent alerts with stock details |
| `get_watchlist_with_alerts(user_id)` | Get watchlist joined with latest alerts |

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
