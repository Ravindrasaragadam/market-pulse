"""
WhatsApp alert provider (stub for future implementation).
Placeholder for WhatsApp Business API integration.
"""

from ..alert_manager import BaseAlertProvider, AlertMessage


class WhatsAppProvider(BaseAlertProvider):
    """
    WhatsApp alert provider - STUB for future implementation.
    
    Future implementation will use WhatsApp Business API.
    Requires:
        - WHATSAPP_API_KEY
        - WHATSAPP_PHONE_NUMBER_ID
        - WHATSAPP_RECIPIENT_PHONE
    """
    
    def __init__(
        self,
        api_key: str = None,
        phone_number_id: str = None,
        recipient_phone: str = None,
        enabled: bool = False
    ):
        super().__init__('whatsapp', enabled)
        self.api_key = api_key
        self.phone_number_id = phone_number_id
        self.recipient_phone = recipient_phone
    
    async def send(self, alert: AlertMessage) -> bool:
        """Send alert via WhatsApp (stub)."""
        if not self.enabled:
            print(f"[WhatsAppProvider] Disabled - would send: {alert.symbol}")
            return True
        
        # STUB: Log the alert for future implementation
        print(f"[WhatsAppProvider] STUB - Alert for {alert.symbol}:")
        print(f"  Signal: {alert.signal_type}")
        print(f"  Reasoning: {alert.reasoning[:100]}...")
        print(f"  To implement: Use WhatsApp Business API")
        
        # TODO: Implement actual WhatsApp API call
        # This would use WhatsApp Business API or a third-party service
        
        return True  # Return True for stub to not block other providers
    
    async def health_check(self) -> bool:
        """Check if WhatsApp provider is healthy (stub)."""
        if not self.enabled:
            return False
        
        # STUB: Always return True for stub
        print("[WhatsAppProvider] STUB - Health check")
        return True
    
    def _format_message(self, alert: AlertMessage) -> str:
        """Format alert for WhatsApp."""
        emoji = {
            'BUY': '🟢',
            'SELL': '🔴',
            'NEUTRAL': '⚪',
            'HOLD': '🟡'
        }.get(alert.signal_type.upper(), '📊')
        
        lines = [
            f"*{emoji} {alert.symbol}*",
            f"*Signal:* {alert.signal_type}",
            f"",
            f"*Reasoning:* {alert.reasoning}",
        ]
        
        if alert.stop_loss:
            lines.append(f"*Stop Loss:* {alert.stop_loss}")
        
        if alert.target:
            lines.append(f"*Target:* {alert.target}")
        
        lines.append(f"Confidence: {int(alert.confidence * 100)}%")
        lines.append(f"{alert.timestamp.strftime('%Y-%m-%d %H:%M')}")
        
        return '\n'.join(lines)
