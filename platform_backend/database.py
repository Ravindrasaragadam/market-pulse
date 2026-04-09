from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_KEY
from datetime import datetime, timedelta, timezone

class DatabaseManager:
    def __init__(self):
        # Basic validation to avoid "Invalid API key" crashes
        is_placeholder = "YOUR_" in SUPABASE_KEY or "anon" in SUPABASE_KEY.lower() == False and len(SUPABASE_KEY) < 20
        if not SUPABASE_URL or not SUPABASE_KEY or "YOUR_" in SUPABASE_KEY:
            self.client = None
            print("Warning: Supabase credentials missing or using placeholders. Data persistence disabled.")
        else:
            try:
                self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                self.client = None
                print(f"Error: Failed to initialize Supabase client: {e}")

    def save_alert(self, symbol, signal, reasoning, strength=None, metadata=None, stock_symbol=None, fundamentals=None, growth_data=None, signal_strength=None):
        if not self.client: return
        data = {
            "symbol": symbol,
            "signal_type": signal,
            "reasoning": reasoning,
            "strength": strength,
            "metadata": metadata,
            "stock_symbol": stock_symbol,
            "fundamentals": fundamentals,
            "growth_data": growth_data,
            "signal_strength": signal_strength
        }
        return self.client.table("alerts").insert(data).execute()

    def save_news(self, news_items):
        if not self.client: return
        # news_items is a list of dicts
        return self.client.table("market_news").insert(news_items).execute()

    def get_recent_alerts(self, limit=5):
        if not self.client: return []
        response = self.client.table("alerts").select("*").order("created_at", desc=True).limit(limit).execute()
        return response.data

    def run_aggregation(self):
        """Calls the stored procedure for rolling aggregation."""
        if not self.client: return
        # Using RPC to call the stored procedure defined in schema.sql
        return self.client.rpc("aggregate_stale_data", {}).execute()
    
    def is_news_sent(self, headline, link):
        """Check if news was already sent in the last 4 hours."""
        if not self.client: return False
        
        try:
            four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=4)
            response = self.client.table('sent_news').select('*').eq('headline', headline).eq('link', link).gte('sent_at', four_hours_ago.isoformat()).execute()
            return len(response.data) > 0
        except Exception as e:
            print(f"Error checking sent news: {e}")
            return False
    
    def mark_news_sent(self, news_items):
        """Mark news items as sent to avoid duplicates."""
        if not self.client: return
        
        sent_data = []
        for item in news_items:
            sent_data.append({
                "headline": item.get('headline', '')[:500],  # Limit headline length
                "link": item.get('link', '')[:1000]  # Limit link length
            })
        
        if sent_data:
            try:
                self.client.table('sent_news').upsert(sent_data).execute()
            except Exception as e:
                print(f"Error marking news as sent: {e}")
    
    def cleanup_old_sent_news(self):
        """Remove sent_news records older than 24 hours."""
        if not self.client: return
        
        try:
            twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
            self.client.table('sent_news').delete().lt('sent_at', twenty_four_hours_ago.isoformat()).execute()
        except Exception as e:
            print(f"Error cleaning up old sent news: {e}")
