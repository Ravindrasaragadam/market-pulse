"""
Lightweight Alert Service - Market Pulse
Polls news sources and sends alerts for buy/sell signals.
Designed for GitHub Actions - minimal processing, maximum speed.
"""

import os
import json
import asyncio
import aiohttp
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dataclasses import dataclass
from supabase import create_client, Client

# Configuration
NEWS_SOURCES = {
    'economic_times': 'https://economictimes.indiatimes.com/rssfeedsdefault.cms',
    'moneycontrol': 'https://www.moneycontrol.com/rss/latestnews.xml',
    'yahoo_finance': 'https://finance.yahoo.com/news/rssindex',
}

# Keywords that indicate significant stock news
SIGNAL_KEYWORDS = {
    'BUY': ['buy', 'upgrade', 'outperform', 'target raised', 'strong growth', 'beat estimates'],
    'SELL': ['sell', 'downgrade', 'underperform', 'target cut', 'missed estimates', 'weak'],
}

WATCHLIST = os.getenv('WATCHLIST_SYMBOLS', 'RELIANCE,TCS,INFY').split(',')
FOCUS_KEYWORDS = os.getenv('FOCUS_KEYWORDS', 'Synbio,AI,Gold').split(',')

SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

# Alert providers
ENABLE_EMAIL = os.getenv('ENABLE_EMAIL_ALERTS', 'false').lower() == 'true'
ENABLE_WEBHOOK = os.getenv('ENABLE_WEBHOOK_ALERTS', 'false').lower() == 'true'
WEBHOOK_URL = os.getenv('ALERT_WEBHOOK_URL', '')
EMAIL_SMTP_SERVER = os.getenv('EMAIL_SMTP_SERVER', '')
EMAIL_FROM = os.getenv('EMAIL_FROM', '')
EMAIL_TO = os.getenv('EMAIL_TO', '')


@dataclass
class NewsItem:
    title: str
    link: str
    source: str
    published: str
    matched_symbols: List[str]
    sentiment: str


class AlertService:
    """Lightweight alert service - polls news and sends notifications."""
    
    def __init__(self):
        self.db = None
        if SUPABASE_URL and SUPABASE_KEY and 'YOUR_' not in SUPABASE_KEY:
            try:
                self.db = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                print(f"Supabase connection failed: {e}")
    
    async def fetch_rss_feed(self, url: str, source: str) -> List[Dict]:
        """Fetch and parse RSS feed."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        content = await response.text()
                        # Simple regex-based parsing (lightweight, no heavy XML lib)
                        import re
                        items = []
                        # Extract item blocks
                        item_blocks = re.findall(r'<item>(.*?)</item>', content, re.DOTALL)
                        for block in item_blocks[:10]:  # Only last 10 items
                            title = re.search(r'<title>(.*?)</title>', block)
                            link = re.search(r'<link>(.*?)</link>', block)
                            pub_date = re.search(r'<pubDate>(.*?)</pubDate>', block)
                            
                            if title and link:
                                items.append({
                                    'title': self._clean_html(title.group(1)),
                                    'link': link.group(1),
                                    'published': pub_date.group(1) if pub_date else datetime.now(timezone.utc).isoformat(),
                                    'source': source
                                })
                        return items
        except Exception as e:
            print(f"Error fetching {source}: {e}")
        return []
    
    def _clean_html(self, text: str) -> str:
        """Remove HTML tags."""
        import re
        return re.sub(r'<[^>]+>', '', text)
    
    def check_for_signals(self, news_item: Dict) -> Optional[NewsItem]:
        """Check if news contains buy/sell signals for watchlist stocks."""
        title_lower = news_item['title'].lower()
        
        # Check for watchlist symbols
        matched_symbols = []
        for symbol in WATCHLIST:
            if symbol.lower() in title_lower:
                matched_symbols.append(symbol)
        
        # Check for focus keywords
        for keyword in FOCUS_KEYWORDS:
            if keyword.lower() in title_lower:
                matched_symbols.append(keyword)
        
        if not matched_symbols:
            return None
        
        # Determine sentiment
        sentiment = 'NEUTRAL'
        for signal, keywords in SIGNAL_KEYWORDS.items():
            if any(kw in title_lower for kw in keywords):
                sentiment = signal
                break
        
        return NewsItem(
            title=news_item['title'],
            link=news_item['link'],
            source=news_item['source'],
            published=news_item['published'],
            matched_symbols=matched_symbols,
            sentiment=sentiment
        )
    
    async def send_alert(self, news_item: NewsItem):
        """Send alert via configured channels."""
        message = f"""
🚨 MARKET ALERT: {news_item.sentiment}

{news_item.title}

Symbols: {', '.join(news_item.matched_symbols)}
Source: {news_item.source}

🔗 {news_item.link}

—
Market Pulse Alert Service
{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
"""
        
        # Save to database
        if self.db:
            try:
                self.db.table('alerts').insert({
                    'symbol': news_item.matched_symbols[0] if news_item.matched_symbols else 'UNKNOWN',
                    'signal_type': news_item.sentiment,
                    'reasoning': news_item.title,
                    'metadata': {
                        'source': news_item.source,
                        'link': news_item.link,
                        'symbols': news_item.matched_symbols
                    }
                }).execute()
                print(f"✅ Alert saved to database: {news_item.title[:50]}...")
            except Exception as e:
                print(f"⚠️ Failed to save alert: {e}")
        
        # Send webhook
        if ENABLE_WEBHOOK and WEBHOOK_URL:
            await self._send_webhook(news_item, message)
        
        # Send email
        if ENABLE_EMAIL and EMAIL_SMTP_SERVER:
            await self._send_email(news_item, message)
        
        print(f"📢 Alert: [{news_item.sentiment}] {news_item.title[:60]}...")
    
    async def _send_webhook(self, news_item: NewsItem, message: str):
        """Send webhook notification."""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    'symbol': news_item.matched_symbols[0] if news_item.matched_symbols else 'UNKNOWN',
                    'signal': news_item.sentiment,
                    'title': news_item.title,
                    'link': news_item.link,
                    'source': news_item.source,
                    'message': message,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                async with session.post(WEBHOOK_URL, json=payload, timeout=10) as response:
                    if response.status == 200:
                        print("✅ Webhook sent")
                    else:
                        print(f"⚠️ Webhook failed: {response.status}")
        except Exception as e:
            print(f"⚠️ Webhook error: {e}")
    
    async def _send_email(self, news_item: NewsItem, message: str):
        """Send email notification."""
        try:
            import smtplib
            from email.mime.text import MIMEText
            
            msg = MIMEText(message)
            msg['Subject'] = f"Market Alert: {news_item.sentiment} - {news_item.matched_symbols[0]}"
            msg['From'] = EMAIL_FROM
            msg['To'] = EMAIL_TO
            
            # Note: For GitHub Actions, you'd need to configure SMTP credentials as secrets
            # This is a placeholder - in practice use services like SendGrid, Mailgun, etc.
            print(f"📧 Email would be sent: {msg['Subject']}")
        except Exception as e:
            print(f"⚠️ Email error: {e}")
    
    async def run(self):
        """Main execution - poll news and send alerts."""
        print("="*50)
        print("MARKET PULSE - LIGHTWEIGHT ALERT SERVICE")
        print(f"Started: {datetime.now(timezone.utc).isoformat()}")
        print("="*50)
        
        all_news = []
        
        # Fetch from all sources
        for source, url in NEWS_SOURCES.items():
            print(f"🔍 Checking {source}...")
            news = await self.fetch_rss_feed(url, source)
            all_news.extend(news)
            print(f"   Found {len(news)} items")
        
        print(f"\n📊 Total news items: {len(all_news)}")
        
        # Check for signals
        alerts_triggered = 0
        for item in all_news:
            signal = self.check_for_signals(item)
            if signal:
                await self.send_alert(signal)
                alerts_triggered += 1
        
        print(f"\n✅ Complete. Alerts triggered: {alerts_triggered}")
        print(f"⏱️  Finished: {datetime.now(timezone.utc).isoformat()}")


async def main():
    """Entry point for GitHub Actions."""
    service = AlertService()
    await service.run()


if __name__ == "__main__":
    asyncio.run(main())
