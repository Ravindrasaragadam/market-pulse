"""
Email alert provider (stub for future implementation).
Placeholder for SMTP email integration.
"""

import html
from ..alert_manager import BaseAlertProvider, AlertMessage


class EmailProvider(BaseAlertProvider):
    """
    Email alert provider - STUB for future implementation.
    
    Future implementation will use SMTP or email service (SendGrid, AWS SES).
    Requires:
        - SMTP_HOST, SMTP_PORT
        - SMTP_USERNAME, SMTP_PASSWORD
        - EMAIL_FROM, EMAIL_TO
    """
    
    def __init__(
        self,
        smtp_host: str = None,
        smtp_port: int = 587,
        username: str = None,
        password: str = None,
        from_email: str = None,
        to_emails: list = None,
        enabled: bool = False
    ):
        super().__init__('email', enabled)
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
        self.from_email = from_email
        self.to_emails = to_emails or []
    
    async def send(self, alert: AlertMessage) -> bool:
        """Send alert via Email (stub)."""
        if not self.enabled:
            print(f"[EmailProvider] Disabled - would send: {alert.symbol}")
            return True
        
        # STUB: Log the alert for future implementation
        print(f"[EmailProvider] STUB - Alert for {alert.symbol}:")
        print(f"  Signal: {alert.signal_type}")
        print(f"  Reasoning: {alert.reasoning[:100]}...")
        print(f"  Recipients: {self.to_emails}")
        print(f"  To implement: Use SMTP or email service (SendGrid/AWS SES)")
        
        # TODO: Implement actual email sending
        # This would use smtplib or an email service API
        
        return True  # Return True for stub to not block other providers
    
    async def health_check(self) -> bool:
        """Check if email provider is healthy (stub)."""
        if not self.enabled:
            return False
        
        # STUB: Check SMTP connection
        print("[EmailProvider] STUB - Health check")
        return True
    
    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters to prevent XSS."""
        if not text:
            return ""
        return html.escape(text)

    def _format_html_message(self, alert: AlertMessage) -> str:
        """Format alert as HTML email."""
        color = {
            'BUY': '#10b981',
            'SELL': '#ef4444',
            'NEUTRAL': '#94a3b8',
            'HOLD': '#f59e0b'
        }.get(alert.signal_type.upper(), '#94a3b8')

        # Escape all user-generated content to prevent XSS
        safe_symbol = self._escape_html(alert.symbol)
        safe_signal = self._escape_html(alert.signal_type)
        safe_reasoning = self._escape_html(alert.reasoning)
        safe_stop_loss = self._escape_html(alert.stop_loss) if alert.stop_loss else None
        safe_target = self._escape_html(alert.target) if alert.target else None

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 8px; padding: 24px; border: 1px solid #334155;">
                <h2 style="color: {color}; margin-bottom: 16px;">
                    {safe_symbol} - {safe_signal}
                </h2>

                <div style="margin-bottom: 16px;">
                    <strong style="color: #94a3b8;">Reasoning:</strong>
                    <p style="margin-top: 8px; line-height: 1.6;">{safe_reasoning}</p>
                </div>

                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                    {f'<div style="background-color: #7f1d1d; padding: 8px 16px; border-radius: 4px;"><strong>Stop Loss:</strong> {safe_stop_loss}</div>' if safe_stop_loss else ''}
                    {f'<div style="background-color: #064e3b; padding: 8px 16px; border-radius: 4px;"><strong>Target:</strong> {safe_target}</div>' if safe_target else ''}
                </div>

                <div style="color: #64748b; font-size: 14px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155;">
                    Confidence: {int(alert.confidence * 100)}%<br>
                    {alert.timestamp.strftime('%Y-%m-%d %H:%M')}
                </div>
            </div>
        </body>
        </html>
        """
        return html_content
    
    def _format_text_message(self, alert: AlertMessage) -> str:
        """Format alert as plain text email."""
        lines = [
            f"{alert.symbol} - {alert.signal_type}",
            f"",
            f"Reasoning: {alert.reasoning}",
        ]
        
        if alert.stop_loss:
            lines.append(f"Stop Loss: {alert.stop_loss}")
        
        if alert.target:
            lines.append(f"Target: {alert.target}")
        
        lines.append(f"Confidence: {int(alert.confidence * 100)}%")
        lines.append(f"Timestamp: {alert.timestamp.strftime('%Y-%m-%d %H:%M')}")
        
        return '\n'.join(lines)
