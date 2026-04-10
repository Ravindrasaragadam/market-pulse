"""
Central alert manager for dispatching alerts to multiple channels.
Scalable architecture supporting multiple alert providers.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class AlertMessage:
    """Standardized alert message structure."""
    symbol: str
    signal_type: str
    reasoning: str
    stop_loss: Optional[str] = None
    target: Optional[str] = None
    confidence: float = 0.7
    timestamp: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.metadata is None:
            self.metadata = {}


class BaseAlertProvider:
    """Base class for alert providers."""
    
    def __init__(self, name: str, enabled: bool = True):
        self.name = name
        self.enabled = enabled
    
    async def send(self, alert: AlertMessage) -> bool:
        """Send alert through this provider. Return True if successful."""
        raise NotImplementedError("Subclasses must implement send()")
    
    async def health_check(self) -> bool:
        """Check if provider is healthy."""
        return self.enabled


class AlertManager:
    """
    Central alert manager that dispatches alerts to multiple providers.
    
    Usage:
        manager = AlertManager()
        manager.register_provider('telegram', TelegramProvider())
        manager.register_provider('queue', QueueProvider())
        
        alert = AlertMessage(symbol="RELIANCE", signal_type="BUY", reasoning="Strong momentum")
        await manager.dispatch(alert)
    """
    
    def __init__(self):
        self.providers: Dict[str, BaseAlertProvider] = {}
        self.failed_deliveries: List[Dict] = []
    
    def register_provider(self, name: str, provider: BaseAlertProvider) -> None:
        """Register a new alert provider."""
        self.providers[name] = provider
        print(f"[AlertManager] Registered provider: {name}")
    
    def unregister_provider(self, name: str) -> None:
        """Unregister an alert provider."""
        if name in self.providers:
            del self.providers[name]
            print(f"[AlertManager] Unregistered provider: {name}")
    
    async def dispatch(self, alert: AlertMessage, provider_names: Optional[List[str]] = None) -> Dict[str, bool]:
        """
        Dispatch alert to all enabled providers or specific providers.
        
        Args:
            alert: The alert message to dispatch
            provider_names: Optional list of provider names to use (default: all)
        
        Returns:
            Dict mapping provider name to success status
        """
        results = {}
        
        # Determine which providers to use
        target_providers = provider_names or list(self.providers.keys())
        
        print(f"[AlertManager] Dispatching alert for {alert.symbol} to providers: {target_providers}")
        
        # Send to all target providers concurrently
        tasks = []
        for name in target_providers:
            if name in self.providers:
                provider = self.providers[name]
                if provider.enabled:
                    task = self._send_with_error_handling(provider, alert)
                    tasks.append((name, task))
                else:
                    results[name] = False
                    print(f"[AlertManager] Provider {name} is disabled")
            else:
                results[name] = False
                print(f"[AlertManager] Provider {name} not found")
        
        # Execute all sends concurrently
        if tasks:
            responses = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
            for (name, _), response in zip(tasks, responses):
                if isinstance(response, Exception):
                    results[name] = False
                    self.failed_deliveries.append({
                        'provider': name,
                        'alert': alert,
                        'error': str(response),
                        'timestamp': datetime.now()
                    })
                    # Limit failed deliveries list to prevent unbounded memory growth
                    if len(self.failed_deliveries) > 1000:
                        self.failed_deliveries = self.failed_deliveries[-1000:]
                    print(f"[AlertManager] Failed to send via {name}: {response}")
                else:
                    results[name] = response
                    status = "SUCCESS" if response else "FAILED"
                    print(f"[AlertManager] {name}: {status}")
        
        return results
    
    async def _send_with_error_handling(self, provider: BaseAlertProvider, alert: AlertMessage) -> bool:
        """Send alert with timeout and error handling."""
        try:
            # 30 second timeout for alert delivery
            result = await asyncio.wait_for(
                provider.send(alert),
                timeout=30.0
            )
            return result
        except asyncio.TimeoutError:
            print(f"[AlertManager] Timeout sending via {provider.name}")
            return False
        except Exception as e:
            print(f"[AlertManager] Error sending via {provider.name}: {e}")
            return False
    
    async def health_check(self) -> Dict[str, bool]:
        """Check health of all providers."""
        results = {}
        for name, provider in self.providers.items():
            try:
                results[name] = await provider.health_check()
            except Exception as e:
                results[name] = False
                print(f"[AlertManager] Health check failed for {name}: {e}")
        return results
    
    def get_failed_deliveries(self, since: Optional[datetime] = None) -> List[Dict]:
        """Get list of failed deliveries."""
        if since:
            return [f for f in self.failed_deliveries if f['timestamp'] > since]
        return self.failed_deliveries.copy()
    
    def clear_failed_deliveries(self) -> None:
        """Clear the failed deliveries log."""
        self.failed_deliveries = []
