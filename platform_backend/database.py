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

    def save_alert(self, symbol, signal, reasoning, strength=None, metadata=None, stock_symbol=None, fundamentals=None, growth_data=None, signal_strength=None, stop_loss=None, target=None):
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
            "signal_strength": signal_strength,
            "stop_loss": stop_loss,
            "target": target
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
        """Check if news was already sent in the last 1 hour."""
        if not self.client: return False
        
        try:
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            response = self.client.table('sent_news').select('*').eq('headline', headline).eq('link', link).gte('sent_at', one_hour_ago.isoformat()).execute()
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
                # Insert data - duplicates will be ignored due to UNIQUE constraint
                self.client.table('sent_news').insert(sent_data).execute()
            except Exception as e:
                # Ignore unique constraint violations (23505)
                if '23505' not in str(e):
                    print(f"Error marking news as sent: {e}")

    def clear_old_sent_news(self, hours=1):
        """Clear sent_news records older than specified hours."""
        if not self.client: return

        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            result = self.client.table('sent_news').delete().lt('sent_at', cutoff_time.isoformat()).execute()
            print(f"Cleared {len(result.data)} old sent_news records")
        except Exception as e:
            print(f"Error clearing old sent news: {e}")
    
    def cleanup_old_sent_news(self):
        """Remove sent_news records older than 24 hours."""
        if not self.client: return
        
        try:
            twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
            self.client.table('sent_news').delete().lt('sent_at', twenty_four_hours_ago.isoformat()).execute()
        except Exception as e:
            print(f"Error cleaning up old sent news: {e}")

    # Dynamic Focus Areas Management
    def get_active_focus_areas(self):
        """Get currently active focus areas ordered by priority."""
        if not self.client: return []
        
        try:
            response = self.client.table('focus_areas').select('*').eq('is_active', True).order('priority', desc=True).execute()
            return response.data
        except Exception as e:
            print(f"Error getting focus areas: {e}")
            return []

    def update_focus_areas(self, new_focus_areas, trigger_type="MANUAL", market_conditions="", reasoning=""):
        """Update focus areas based on market analysis.
        
        new_focus_areas: List of dicts with keyword, category, priority, rationale
        """
        if not self.client: return
        
        try:
            # Get current focus areas for history
            current = self.get_active_focus_areas()
            previous_keywords = [f['keyword'] for f in current]
            new_keywords = [f['keyword'] for f in new_focus_areas]
            
            # Record the evaluation
            self.client.table('focus_area_evaluations').insert({
                'previous_focus_areas': previous_keywords,
                'new_focus_areas': new_keywords,
                'market_conditions': market_conditions,
                'trigger_type': trigger_type,
                'reasoning': reasoning
            }).execute()
            
            # Deactivate old focus areas that are not user-defined
            self.client.table('focus_areas').update({'is_active': False}).eq('is_user_defined', False).execute()
            
            # Insert or update new focus areas
            for area in new_focus_areas:
                data = {
                    'keyword': area['keyword'],
                    'category': area.get('category', 'SECTOR'),
                    'priority': area.get('priority', 5),
                    'rationale': area.get('rationale', ''),
                    'market_context': area.get('market_context', ''),
                    'is_user_defined': area.get('is_user_defined', False),
                    'is_active': True,
                    'metadata': area.get('metadata', {}),
                    'last_evaluated_at': datetime.now(timezone.utc).isoformat()
                }
                self.client.table('focus_areas').upsert(data, on_conflict='keyword').execute()
            
            print(f"Updated focus areas: {new_keywords}")
        except Exception as e:
            print(f"Error updating focus areas: {e}")

    def should_reevaluate_focus_areas(self):
        """Check if focus areas should be reevaluated (weekly or event-driven)."""
        if not self.client: return True  # Reevaluate if no database
        
        try:
            # Check last evaluation
            response = self.client.table('focus_area_evaluations').select('evaluated_at').order('evaluated_at', desc=True).limit(1).execute()
            
            if not response.data:
                return True  # Never evaluated, do it now
            
            last_eval = datetime.fromisoformat(response.data[0]['evaluated_at'].replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            
            # Reevaluate if more than 7 days old
            if (now - last_eval).days >= 7:
                return True
            
            return False
        except Exception as e:
            print(f"Error checking focus area reevaluation: {e}")
            return True  # Default to reevaluating on error
