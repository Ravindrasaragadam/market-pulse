"""
Telegram alert provider.
Sends alerts via Telegram Bot API.
"""

import asyncio
import aiohttp
from typing import Optional

from ..alert_manager import BaseAlertProvider, AlertMessage


class TelegramProvider(BaseAlertProvider):
    """
    Telegram alert provider using Bot API.
    
    Requires:
        - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
        - TELEGRAM_CHAT_ID: Chat ID to send messages to
    """
    
    def __init__(
        self,
        bot_token: str,
        chat_id: str,
        enabled: bool = True,
        parse_mode: str = 'HTML'
    ):
        super().__init__('telegram', enabled)
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.parse_mode = parse_mode
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
    
    async def send(self, alert: AlertMessage) -> bool:
        """Send alert via Telegram."""
        if not self.enabled:
            print(f"[TelegramProvider] Disabled - would send: {alert.symbol}")
            return True
        
        try:
            message = self._format_message(alert)
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/sendMessage"
                payload = {
                    'chat_id': self.chat_id,
                    'text': message,
                    'parse_mode': self.parse_mode,
                    'disable_web_page_preview': True
                }
                
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        print(f"[TelegramProvider] Sent alert for {alert.symbol}")
                        return True
                    else:
                        error_text = await response.text()
                        print(f"[TelegramProvider] Failed to send: {response.status} - {error_text}")
                        return False
                        
        except Exception as e:
            print(f"[TelegramProvider] Error sending alert: {e}")
            return False
    
    def _format_message(self, alert: AlertMessage) -> str:
        """Format alert as HTML message for Telegram."""
        emoji = {
            'BUY': '🟢',
            'SELL': '🔴',
            'NEUTRAL': '⚪',
            'HOLD': '🟡'
        }.get(alert.signal_type.upper(), '📊')
        
        lines = [
            f"<b>{emoji} {alert.symbol}</b>",
            f"<b>Signal:</b> {alert.signal_type}",
            f"",
            f"<b>Reasoning:</b> {alert.reasoning}",
        ]
        
        if alert.stop_loss:
            lines.append(f"\n<b>Stop Loss:</b> {alert.stop_loss}")
        
        if alert.target:
            lines.append(f"<b>Target:</b> {alert.target}")
        
        lines.append(f"\n<i>Confidence: {int(alert.confidence * 100)}%</i>")
        lines.append(f"<i>{alert.timestamp.strftime('%Y-%m-%d %H:%M')}</i>")
        
        return '\n'.join(lines)
    
    async def health_check(self) -> bool:
        """Check if Telegram bot is healthy."""
        if not self.enabled:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/getMe"
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('ok', False)
                    return False
        except Exception as e:
            print(f"[TelegramProvider] Health check failed: {e}")
            return False
