import requests
import yfinance as yf
from bs4 import BeautifulSoup
from .config import WATCHLIST, INCLUDE_INTERNATIONAL

class MarketResearcher:
    def __init__(self):
        self.watchlist = WATCHLIST
        self.include_international = INCLUDE_INTERNATIONAL

    def get_stock_movements(self):
        """Checks for 'Big Moves' in the watchlist (>2-3%)."""
        significant_moves = []
        for symbol in self.watchlist:
            try:
                # Intelligent ticker selection
                # Commodities like Gold (GC=F) or Silver (SI=F) already have suffixes
                # US tech stocks (NVDA, SMR) don't need .NS
                # Only add .NS if it's a simple Indian ticker and not in common US list
                if "=" in symbol or any(us_sym in symbol for us_sym in ["NVDA", "VRT", "ANET", "MU", "CRSP", "DNA", "SMR", "OKLO"]):
                    ticker_sym = symbol
                else:
                    ticker_sym = f"{symbol}.NS" if "." not in symbol else symbol
                
                ticker = yf.Ticker(ticker_sym)
                data = ticker.history(period="1d")
                if not data.empty:
                    change = ((data['Close'].iloc[-1] - data['Open'].iloc[-1]) / data['Open'].iloc[-1]) * 100
                    if abs(change) >= 2.0:
                        significant_moves.append({
                            "symbol": symbol,
                            "change": round(change, 2),
                            "price": round(data['Close'].iloc[-1], 2)
                        })
            except Exception as e:
                print(f"Error fetching price for {symbol}: {e}")
        return significant_moves

    def get_indian_news(self):
        """Scrapes headlines from Economic Times and Business Standard (RSS)."""
        news_items = []
        feeds = [
            "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
            "https://www.business-standard.com/rss/markets-106.rss"
        ]
        
        for url in feeds:
            try:
                response = requests.get(url, timeout=10)
                soup = BeautifulSoup(response.content, features="xml")
                items = soup.find_all('item')[:5] # Top 5 from each
                for item in items:
                    news_items.append({
                        "headline": item.title.text,
                        "link": item.link.text,
                        "source": "ET/BS",
                        "is_international": False
                    })
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return news_items

    def get_global_news(self):
        """Scrapes global finance headlines if enabled."""
        if not self.include_international:
            return []
        
        # Example using Yahoo Finance RSS
        news_items = []
        url = "https://finance.yahoo.com/news/rssindex"
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all('item')[:5]
            for item in items:
                news_items.append({
                    "headline": item.title.text,
                    "link": item.link.text,
                    "source": "Yahoo",
                    "is_international": True
                })
        except Exception as e:
            print(f"Error fetching global news: {e}")
        return news_items

    def collect_all_data(self):
        """Combines all input for the AI Brain."""
        return {
            "moves": self.get_stock_movements(),
            "local_news": self.get_indian_news(),
            "global_news": self.get_global_news() if self.include_international else []
        }
