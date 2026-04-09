import asyncio
import os
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from .config import (
    TELEGRAM_API_ID, TELEGRAM_API_HASH, 
    TELEGRAM_BOT_TOKEN, TELEGRAM_SESSION_NAME,
    TELEGRAM_ALLOWED_CHATS, EVALUATION_INTERVAL_MINS
)
from .researcher import MarketResearcher
from .brain import AIAnalyzer
from .database import DatabaseManager
import os

class MarketMonitor:
    def __init__(self):
        self.researcher = MarketResearcher()
        self.analyzer = AIAnalyzer()
        self.db = DatabaseManager()
        self.client = None
        self.bot_client = None

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
        for chat_id in TELEGRAM_ALLOWED_CHATS:
            async for message in self.client.iter_messages(chat_id, min_id=last_id):
                if message.id > max_id:
                    max_id = message.id
                
                if message.photo:
                    path = await message.download_media(file='downloads/')
                    all_new_images.append(path)
                elif message.text:
                    all_new_text.append(message.text)

        # 2. Daily/Periodic Market Review (Research + News)
        research_data = self.researcher.collect_all_data()
        
        # Add Telegram context to news
        if all_new_text:
            research_data['telegram_context'] = all_new_text[:20]

        print(f"Found {len(all_new_images)} images and {len(all_new_text)} news snippets.")

        # 3. Analyze Images (Technical Analysis)
        for img_path in all_new_images:
            analysis_text = self.analyzer.analyze_market_state(research_data, image_path=img_path)
            if analysis_text:
                await self.send_raw_alert(analysis_text)
                # Save as a general macro alert
                self.db.save_alert("MARKET_CHART", "IMAGE_ANALYSIS", analysis_text)
            os.remove(img_path)

        # 4. Analyze General Sentiment if new text found or no images
        if all_new_text or not all_new_images:
            analysis_text = self.analyzer.analyze_market_state(research_data)
            if analysis_text:
                await self.send_raw_alert(analysis_text)
                self.db.save_alert("MARKET_MACRO", "SENTIMENT", analysis_text)

        # 5. Save state
        if max_id > last_id:
            await self.update_last_processed_id(max_id)

        await self.client.disconnect()
        await self.bot_client.disconnect()

    async def send_raw_alert(self, text):
        """Dispatch raw text signals to the Telegram Alert Bot."""
        from .config import TELEGRAM_ALERT_CHAT_ID
        # Simple formatting for raw text from AI
        msg = f"🔍 **MARKET PULSE INSIGHT**\n\n{text}\n\n#AutomatedAnalysis"
        await self.bot_client.send_message(TELEGRAM_ALERT_CHAT_ID, msg)

if __name__ == "__main__":
    monitor = MarketMonitor()
    asyncio.run(monitor.run_once())
