# Antigravity Pulse: Market Intelligence Platform 🚀

Antigravity Pulse is a specialized, zero-cost market analysis suite designed to monitor specific sectors (Synbio, SMR, AI Infra, Commodities) across Telegram and news channels. It uses **NVIDIA NIM (Llama 3.2 Vision)** for multi-modal analysis and **Supabase** for persistent, self-learning data storage.

## 🌟 Key Features
- **Smart Monitoring**: Real-time Telegram listener for chart screenshots and news aggregation.
- **AI-Powered Signals**: Accurate BUY/SELL suggestions based on chart vision and sentiment.
- **Self-Learning Cache**: Aggregates years of history while staying under free storage limits.
- **Real-Time Dashboard**: Premium Next.js interface with live charts and historical metrics.

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

## 🛠 Project Structure
- `platform_backend/`: Python-based research and monitoring engine.
- `platform_dashboard/`: Next.js web dashboard.
- `supabase/`: Database schema and aggregation procedures.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
