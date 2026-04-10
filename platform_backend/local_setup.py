#!/usr/bin/env python3
"""
Local One-Time Processing Script - Market Pulse
Run this ONCE on your local laptop to set up the database and initial data.
"""

import os
import sys
import json
from datetime import datetime, timezone
from typing import List, Dict, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

DEFAULT_INDIA_STOCKS = [
    ('RELIANCE.NS', 'Reliance Industries', 'Energy', 'Large Cap'),
    ('TCS.NS', 'Tata Consultancy Services', 'IT', 'Large Cap'),
    ('INFY.NS', 'Infosys', 'IT', 'Large Cap'),
    ('HDFCBANK.NS', 'HDFC Bank', 'Banking', 'Large Cap'),
    ('ICICIBANK.NS', 'ICICI Bank', 'Banking', 'Large Cap'),
    ('HINDUNILVR.NS', 'Hindustan Unilever', 'FMCG', 'Large Cap'),
    ('SBIN.NS', 'State Bank of India', 'Banking', 'Large Cap'),
    ('BHARTIARTL.NS', 'Bharti Airtel', 'Telecom', 'Large Cap'),
    ('ITC.NS', 'ITC Limited', 'FMCG', 'Large Cap'),
    ('KOTAKBANK.NS', 'Kotak Mahindra Bank', 'Banking', 'Large Cap'),
]

DEFAULT_US_STOCKS = [
    ('AAPL', 'Apple Inc', 'Technology', 'Large Cap'),
    ('MSFT', 'Microsoft Corporation', 'Technology', 'Large Cap'),
    ('GOOGL', 'Alphabet Inc', 'Technology', 'Large Cap'),
    ('AMZN', 'Amazon.com Inc', 'Consumer', 'Large Cap'),
    ('NVDA', 'NVIDIA Corporation', 'Technology', 'Large Cap'),
    ('META', 'Meta Platforms', 'Technology', 'Large Cap'),
    ('TSLA', 'Tesla Inc', 'Automobile', 'Large Cap'),
    ('JPM', 'JPMorgan Chase', 'Banking', 'Large Cap'),
    ('JNJ', 'Johnson & Johnson', 'Pharma', 'Large Cap'),
    ('V', 'Visa Inc', 'Financial', 'Large Cap'),
]


class LocalSetup:
    def __init__(self):
        self.db: Optional[Client] = None
        self._init_supabase()
    
    def _init_supabase(self):
        if not SUPABASE_URL or not SUPABASE_KEY or 'YOUR_' in SUPABASE_KEY:
            print("ERROR: Supabase credentials not configured!")
            sys.exit(1)
        
        try:
            self.db = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("Connected to Supabase")
        except Exception as e:
            print(f"Failed to connect: {e}")
            sys.exit(1)
    
    def run_setup(self):
        print("MARKET PULSE - LOCAL ONE-TIME SETUP")
        print("=" * 50)
        
        # 1. Populate stock symbols
        self.populate_stock_symbols()
        
        # 2. Create default watchlist
        self.create_default_watchlist()
        
        # 3. Seed sample alerts
        self.seed_sample_alerts()
        
        print("\nSetup complete!")
    
    def populate_stock_symbols(self):
        print("\nPopulating stock symbols...")
        
        all_stocks = []
        for symbol, name, sector, market_cap in DEFAULT_INDIA_STOCKS:
            all_stocks.append({
                'symbol': symbol,
                'name': name,
                'sector': sector,
                'market_cap_category': market_cap,
                'is_active': True,
                'metadata': {'market': 'INDIA', 'exchange': 'NSE'}
            })
        
        for symbol, name, sector, market_cap in DEFAULT_US_STOCKS:
            all_stocks.append({
                'symbol': symbol,
                'name': name,
                'sector': sector,
                'market_cap_category': market_cap,
                'is_active': True,
                'metadata': {'market': 'US', 'exchange': 'NYSE/NASDAQ'}
            })
        
        try:
            self.db.table('stock_symbols').upsert(all_stocks).execute()
            print(f"Inserted {len(all_stocks)} stocks")
        except Exception as e:
            print(f"Error: {e}")
    
    def create_default_watchlist(self):
        print("\nCreating default watchlist...")
        user_id = '00000000-0000-0000-0000-000000000000'
        
        entries = []
        for i, (symbol, _, _, _) in enumerate(DEFAULT_INDIA_STOCKS[:5]):
            entries.append({'user_id': user_id, 'symbol': symbol, 'priority': i+1})
        for i, (symbol, _, _, _) in enumerate(DEFAULT_US_STOCKS[:5]):
            entries.append({'user_id': user_id, 'symbol': symbol, 'priority': i+6})
        
        try:
            self.db.table('user_watchlist').upsert(entries).execute()
            print(f"Created watchlist with {len(entries)} stocks")
        except Exception as e:
            print(f"Error: {e}")
    
    def seed_sample_alerts(self):
        print("\nSeeding sample alerts...")
        alerts = [
            {'symbol': 'INDIA_MARKET', 'signal_type': 'NEUTRAL', 'reasoning': 'Market consolidating. Watch for breakout.', 'strength': 3},
            {'symbol': 'US_MARKET', 'signal_type': 'BULLISH', 'reasoning': 'Tech stocks showing strength.', 'strength': 4},
        ]
        
        try:
            self.db.table('alerts').insert(alerts).execute()
            print(f"Created {len(alerts)} sample alerts")
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    setup = LocalSetup()
    setup.run_setup()
