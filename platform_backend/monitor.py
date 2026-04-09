import asyncio
import os
from telethon import TelegramClient, events
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .config import (
    TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION_NAME, 
    TELEGRAM_ALLOWED_CHATS, TELEGRAM_ALERT_CHAT_ID, TELEGRAM_BOT_TOKEN,
    EVALUATION_INTERVAL
)
from .researcher import MarketResearcher
from .brain import AIAnalyzer
from .database import DatabaseManager

# Initialize components
client = TelegramClient(TELEGRAM_SESSION_NAME, TELEGRAM_API_ID, TELEGRAM_API_HASH)
bot_client = TelegramClient('bot_session', TELEGRAM_API_ID, TELEGRAM_API_HASH)
researcher = MarketResearcher()
analyzer = AIAnalyzer()
db = DatabaseManager()

async def send_alert(message):
    """Sends a message to the target Telegram alert channel."""
    await bot_client.send_message(TELEGRAM_ALERT_CHAT_ID, message)

async def perform_market_review(manual=False):
    """Periodic task to scan news and prices and send alerts if needed."""
    msg = "Running manual market review..." if manual else "Running periodic market review..."
    print(msg)
    if manual:
        await send_alert("🔍 **Manual Scan Triggered... Analyzing...**")
        
    data = researcher.collect_all_data()
    
    # Save raw news for aggregation later
    if data['local_news'] or data['global_news']:
        db.save_news(data['local_news'] + data['global_news'])

    # Analyze state
    if data['moves'] or data['local_news'] or manual:
        analysis = analyzer.analyze_market_state(data)
        
        # Determine if we should alert
        if "ALERT: True" in analysis or manual:
            await send_alert(f"🚀 **MARKET ANALYSIS{' (MANUAL)' if manual else ''}** 🚀\n\n{analysis}")
            # Log the alert to Supabase
            db.save_alert("MARKET", "MULTI", analysis)

@bot_client.on(events.NewMessage(pattern='/scan'))
async def manual_trigger_handler(event):
    """Manual trigger for mid-day review via bot command."""
    await perform_market_review(manual=True)

@client.on(events.NewMessage(chats=TELEGRAM_ALLOWED_CHATS))
async def telegram_handler(event):
    """Handles incoming images and messages from monitored channels."""
    if event.message.media:
        print("Image detected! Downloading for analysis...")
        path = await event.client.download_media(event.message, file='downloads/')
        
        # Immediate research and analysis
        data = researcher.collect_all_data()
        analysis = analyzer.analyze_market_state(data, image_path=path)
        
        # Send result back via Bot
        await send_alert(f"📊 **CHART ANALYSIS** 📊\n\n{analysis}")
        
        # Cleanup
        if os.path.exists(path):
            os.remove(path)

async def main():
    # Start bot and user sessions
    await client.start()
    await bot_client.start(bot_token=TELEGRAM_BOT_TOKEN)
    
    print("Antigravity Pulse Monitor is LIVE.")
    print(f"Monitoring Chats: {TELEGRAM_ALLOWED_CHATS}")
    
    # Setup Scheduler for 15-30min reviews
    scheduler = AsyncIOScheduler()
    scheduler.add_job(perform_market_review, 'interval', minutes=EVALUATION_INTERVAL)
    scheduler.add_job(db.run_aggregation, 'cron', hour=3, minute=30) # Daily cleanup
    scheduler.start()

    # Keep running
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
