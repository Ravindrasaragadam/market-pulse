# Market Pulse: Market Intelligence Platform 🚀

Market Pulse is a specialized, zero-cost market analysis suite designed to monitor specific sectors (Synbio, SMR, AI Infra, Commodities) across Telegram and news channels. It uses **NVIDIA NIM (Llama 3.2 Vision)** for multi-modal analysis and **Supabase** for persistent, self-learning data storage.

## 🌟 Key Features
- **Smart Monitoring**: Real-time Telegram listener for chart screenshots and news aggregation.
- **AI-Powered Signals**: Accurate BUY/SELL suggestions based on chart vision and sentiment.
- **Self-Learning Cache**: Aggregates years of history while staying under free storage limits.
- **Real-Time Dashboard**: Premium Next.js interface with live charts and historical metrics.
- **Multi-Channel Alerts**: Scalable alert system supporting Telegram, WhatsApp (stub), Email (stub), and Message Queues.
- **Smart Model Selection**: Uses appropriate NVIDIA NIM models for different tasks (financial analysis, signal extraction, summarization).
- **Intelligent Stock Detection**: Automatic US vs Indian stock detection for proper exchange suffix handling.
- **AI Analysis Caching**: Persistent AI summaries with localStorage caching to reduce API calls.
- **Stop Loss & Target Tracking**: AI-extracted stop loss and target levels for each signal.

## 🚀 Quick Start
For full setup, calibration, and cloud deployment instructions, see the **[Usage Guide](USAGE_GUIDE.md)**.

1. **Install Dependencies**:
   ```bash
   pip install -r platform_backend/requirements.txt
   npm install --prefix platform_dashboard
   ```
2. **Configure Environment**:
   Copy `platform_backend/.env.example` to `platform_backend/.env` and fill in your API keys.
3. **Run Monitor**:
   ```bash
   python -m platform_backend.monitor
   ```

## ⚙️ Configuration

### Environment Variables

Core settings in `platform_backend/.env`:

| Variable | Description | Required |
|----------|-------------|----------|
| `NVIDIA_NIM_API_KEY` | API key for NVIDIA NIM LLM service | Yes |
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase database credentials | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for alerts | Optional |
| `TELEGRAM_CHAT_ID` | Chat ID for Telegram alerts | Optional |
| `ENABLE_TELEGRAM_ALERTS` | Set to `false` to disable Telegram (default: `true`) | Optional |

### Alert System

The platform supports multiple alert channels:

- **Telegram** (fully functional): Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`
- **WhatsApp** (stub): Placeholder for future WhatsApp Business API integration
- **Email** (stub): Placeholder for future SMTP/email service integration
- **Message Queue** (stub): Placeholder for SQS/RabbitMQ integration

### AI Model Selection

Different NVIDIA NIM models are used for different tasks:

- `market_summary`: `meta/llama-3.1-405b-instruct` (complex reasoning)
- `stock_analysis`: `nvidia/nemotron-4-340b-instruct` (financial focused)
- `signal_extraction`: `meta/llama-3.1-8b-instruct` (fast structured output)
- `news_summarization`: `google/gemma-2-9b-it` (quick summarization)

## 🛠 Project Structure
- `platform_backend/`: Python-based research and monitoring engine.
- `platform_dashboard/`: Next.js web dashboard.
- `supabase/`: Market Pulse Database Schema and aggregation procedures.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
