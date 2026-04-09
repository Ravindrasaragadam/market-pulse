import asyncio
import os
from datetime import datetime, timezone, timedelta
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from .config import (
    TELEGRAM_API_ID, TELEGRAM_API_HASH, 
    TELEGRAM_BOT_TOKEN, TELEGRAM_SESSION_NAME,
    TELEGRAM_ALLOWED_CHATS, EVALUATION_INTERVAL_MINS,
    INCLUDE_INTERNATIONAL, MARKET_OPEN, MARKET_CLOSE
)
from .researcher import MarketResearcher
from .brain import AIAnalyzer
from .database import DatabaseManager
import os

class MarketMonitor:
    def __init__(self):
        self.db = DatabaseManager()
        self.researcher = MarketResearcher(db=self.db)
        self.analyzer = AIAnalyzer()
        self.client = None
        self.bot_client = None
    
    def is_daily_summary_time(self):
        """Check if current time is 8 AM or 5 PM IST."""
        now = datetime.now(timezone.utc)
        # Convert IST to UTC (IST = UTC+5:30)
        ist_offset = timedelta(hours=5, minutes=30)
        ist_time = now + ist_offset
        
        # Check if it's 8:00 AM or 5:00 PM IST (within 1 minute window)
        hour = ist_time.hour
        minute = ist_time.minute
        
        return (hour == 8 and minute == 0) or (hour == 17 and minute == 0)

    async def _init_clients(self):
        """Initialize clients within the active async loop."""
        if not self.client:
            session_str = os.getenv("TELEGRAM_STRING_SESSION")
            if session_str:
                session = StringSession(session_str)
            else:
                session = TELEGRAM_SESSION_NAME # Fallback to file session (local only)
            
            self.client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
            
        if not self.bot_client:
            self.bot_client = TelegramClient('bot_session', TELEGRAM_API_ID, TELEGRAM_API_HASH)

    async def get_last_processed_id(self):
        """Fetch the last processed message ID from Supabase."""
        if not self.db.client: return 0
        state = self.db.client.table('system_state').select('value').eq('key', 'last_telegram_msg_id').execute()
        if state.data:
            return state.data[0]['value'].get('id', 0)
        return 0

    async def update_last_processed_id(self, msg_id):
        """Save the last processed message ID to Supabase."""
        if not self.db.client: return
        self.db.client.table('system_state').upsert({
            'key': 'last_telegram_msg_id',
            'value': {'id': msg_id}
        }).execute()

    async def run_once(self):
        """Single execution loop for serverless/GitHub Actions."""
        await self._init_clients()
        await self.client.start()
        await self.bot_client.start(bot_token=TELEGRAM_BOT_TOKEN)
        
        last_id = await self.get_last_processed_id()
        print(f"Scanning for messages newer than ID: {last_id}")
        
        all_new_images = []
        all_new_text = []
        max_id = last_id

        # 1. Fetch ALL new messages since last run (Batch processing)
        from datetime import datetime, timedelta, timezone
        search_start = datetime.now(timezone.utc) - timedelta(minutes=45) # 45m safety window

        for chat_id in TELEGRAM_ALLOWED_CHATS:
            # We fetch up to 50 messages per channel
            async for message in self.client.iter_messages(
                chat_id, 
                min_id=last_id, 
                offset_date=search_start,
                reverse=True,
                limit=50
            ):
                if message.id > max_id:
                    max_id = message.id
                
                if message.photo:
                    path = await message.download_media(file='downloads/')
                    all_new_images.append(path)
                    print(f"Downloaded image from message {message.id}")
                elif message.text:
                    all_new_text.append(message.text)

        # 2. Daily/Periodic Market Review (Research + News)
        is_daily_summary = self.is_daily_summary_time()
        
        if is_daily_summary:
            print("Daily summary time - generating comprehensive report")
            research_data = self.researcher.collect_all_data()
            analysis_text = self.analyzer.analyze_daily_summary(research_data)
            if analysis_text:
                await self.send_raw_alert(analysis_text, "📊 Daily Market Summary")
                self.db.save_alert("DAILY_SUMMARY", "COMPREHENSIVE", analysis_text)
        elif INCLUDE_INTERNATIONAL:
            # Send separate India and US reports
            print("Generating separate India and US market reports")
            
            # India Report
            india_data = self.researcher.collect_india_data()
            india_analysis = self.analyzer.analyze_india_market(india_data)
            if india_analysis:
                await self.send_raw_alert(india_analysis, "🇮🇳 India Market Pulse")
                self.db.save_alert("INDIA_MARKET", "INDIA_REPORT", india_analysis)
                
                # Extract and save individual stock signals
                stock_signals = self.analyzer.extract_stock_signals(india_analysis)
                for signal in stock_signals:
                    # Fetch real fundamentals and historical data
                    fundamentals = self.researcher.get_stock_fundamentals(signal['symbol'])
                    historical_data = self.researcher.get_stock_historical_data(signal['symbol'])

                    self.db.save_alert(
                        symbol="INDIA_STOCK",
                        signal=signal['signal'],
                        reasoning=signal['reasoning'],
                        stock_symbol=signal['symbol'],
                        signal_strength=0.8 if signal['signal'] == 'BUY' else 0.2 if signal['signal'] == 'SELL' else 0.5,
                        metadata={'change': signal.get('change', 0)},
                        fundamentals=fundamentals,
                        growth_data=historical_data
                    )
            
            # US Report
            us_data = self.researcher.collect_us_data()
            us_analysis = self.analyzer.analyze_us_market(us_data)
            if us_analysis:
                await self.send_raw_alert(us_analysis, "🇺🇸 US Market Pulse")
                self.db.save_alert("US_MARKET", "US_REPORT", us_analysis)
                
                # Extract and save individual stock signals
                stock_signals = self.analyzer.extract_stock_signals(us_analysis)
                for signal in stock_signals:
                    # Fetch real fundamentals and historical data
                    fundamentals = self.researcher.get_stock_fundamentals(signal['symbol'])
                    historical_data = self.researcher.get_stock_historical_data(signal['symbol'])

                    self.db.save_alert(
                        symbol="US_STOCK",
                        signal=signal['signal'],
                        reasoning=signal['reasoning'],
                        stock_symbol=signal['symbol'],
                        signal_strength=0.8 if signal['signal'] == 'BUY' else 0.2 if signal['signal'] == 'SELL' else 0.5,
                        metadata={'change': signal.get('change', 0)},
                        fundamentals=fundamentals,
                        growth_data=historical_data
                    )
        else:
            # Single combined report (India only)
            research_data = self.researcher.collect_all_data()
            analysis_text = self.analyzer.analyze_market_state(research_data)
            if analysis_text:
                await self.send_raw_alert(analysis_text, "🇮🇳 India Market Pulse")
                self.db.save_alert("INDIA_MARKET", "COMBINED_REPORT", analysis_text)
        
        # Add Telegram context to news
        if all_new_text:
            research_data['telegram_context'] = all_new_text[:50] # Increased for broader coverage

        print(f"Total Found: {len(all_new_images)} images and {len(all_new_text)} news snippets.")

        # 3. Analyze Images (Technical Analysis) - Capped at 10 to avoid timeout/spam
        image_count = 0
        for img_path in reversed(all_new_images): # Start with most recent
            if image_count >= 10: break
            
            print(f"Analyzing image {image_count+1}/10...")
            analysis_text = self.analyzer.analyze_market_state(research_data, image_path=img_path)
            if analysis_text:
                await self.send_raw_alert(analysis_text, "CHART ANALYSIS")
                self.db.save_alert("MARKET_CHART", "IMAGE_ANALYSIS", analysis_text)
            os.remove(img_path)
            image_count += 1

        # 4. Mark all news as sent to avoid duplicates
        all_news = self.researcher.get_all_news_for_tracking()
        if all_news:
            self.db.mark_news_sent(all_news)
            print(f"Marked {len(all_news)} news items as sent")
        
        # 5. Cleanup old sent news records
        self.db.cleanup_old_sent_news()
        print("Cleaned up old sent news records")

        # 6. Save state
        if max_id > last_id:
            await self.update_last_processed_id(max_id)

        await self.client.disconnect()
        await self.bot_client.disconnect()

    async def send_raw_alert(self, text, title):
        """Dispatch raw text signals with intelligent message splitting at section boundaries."""
        from .config import TELEGRAM_ALERT_CHAT_ID
        
        # Split message if it exceeds Telegram's 4096 character limit
        # We use a safe margin of 4000 and split at section boundaries
        MAX_LEN = 4000
        
        # Try to split at section boundaries (double newlines or markdown headers)
        sections = text.split('\n\n')
        parts = []
        current_part = ""
        
        for section in sections:
            if len(current_part) + len(section) + 2 <= MAX_LEN:
                current_part += section + "\n\n"
            else:
                if current_part:
                    parts.append(current_part.strip())
                # If a single section is too long, split it by sentences
                if len(section) > MAX_LEN:
                    sentences = section.split('. ')
                    temp_part = ""
                    for sentence in sentences:
                        if len(temp_part) + len(sentence) + 2 <= MAX_LEN:
                            temp_part += sentence + ". "
                        else:
                            if temp_part:
                                parts.append(temp_part.strip())
                            temp_part = sentence + ". "
                    if temp_part:
                        current_part = temp_part
                else:
                    current_part = section + "\n\n"
        
        if current_part:
            parts.append(current_part.strip())
        
        # Send each part with continuation markers
        for idx, part in enumerate(parts):
            suffix = f" (Part {idx+1}/{len(parts)})" if len(parts) > 1 else ""
            continuation = "\n\n..." if idx < len(parts) - 1 else ""
            prefix = "(continued...)\n\n" if idx > 0 else ""
            msg = f"🔍 **{title}{suffix}\n\n**\n\n{prefix}{part}{continuation}\n\n#AutomatedAnalysis"
            await self.bot_client.send_message(TELEGRAM_ALERT_CHAT_ID, msg)

if __name__ == "__main__":
    monitor = MarketMonitor()
    asyncio.run(monitor.run_once())
