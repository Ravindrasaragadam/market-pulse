from supabase import create_client, Client
from .config import SUPABASE_URL, SUPABASE_KEY

class DatabaseManager:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            self.client = None
            print("Warning: Supabase credentials missing. Data persistence disabled.")
        else:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def save_alert(self, symbol, signal, reasoning, strength=None, metadata=None):
        if not self.client: return
        data = {
            "symbol": symbol,
            "signal_type": signal,
            "reasoning": reasoning,
            "strength": strength,
            "metadata": metadata
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
