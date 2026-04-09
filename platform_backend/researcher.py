import requests
import yfinance as yf
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
from .config import WATCHLIST, INCLUDE_INTERNATIONAL, FOCUS_KEYWORDS

class MarketResearcher:
    def __init__(self, db=None):
        self.watchlist = WATCHLIST
        self.include_international = INCLUDE_INTERNATIONAL
        self.db = db

    def get_stock_movements(self, filter_significant=True):
        """Checks for movements in the watchlist. If filter_significant is False, returns all (for AI)."""
        results = []
        for symbol in self.watchlist:
            if not symbol: continue
            try:
                # 1. Try raw symbol first (Standard for US Stocks: NVDA, DNA, TWST)
                ticker_sym = symbol
                ticker = yf.Ticker(ticker_sym)
                # Use a small fast fetch to check if it exists
                data = ticker.history(period="1d")
                
                # 2. If no data, try adding .NS (Indian National Stock Exchange)
                if data.empty and "." not in symbol:
                    ticker_sym = f"{symbol}.NS"
                    ticker = yf.Ticker(ticker_sym)
                    data = ticker.history(period="1d")

                if not data.empty:
                    change = ((data['Close'].iloc[-1] - data['Open'].iloc[-1]) / data['Open'].iloc[-1]) * 100
                    stats = {
                        "symbol": symbol,
                        "change": round(change, 2),
                        "price": round(data['Close'].iloc[-1], 2)
                    }
                    if not filter_significant or abs(change) >= 2.0:
                        results.append(stats)
                else:
                    print(f"No price data found for {symbol} (tried raw and .NS)")
            except Exception as e:
                print(f"Error fetching price for {symbol}: {e}")
        return results

    def get_indian_news(self, filter_sent=True):
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
                items = soup.find_all('item')[:10] # Increased to 10 for more coverage
                for item in items:
                    # Parse publication date if available
                    pub_date = None
                    if item.pubDate:
                        try:
                            pub_date = datetime.fromisoformat(item.pubDate.text.replace('Z', '+00:00'))
                        except:
                            pub_date = datetime.now(timezone.utc)
                    
                    news_item = {
                        "headline": item.title.text,
                        "link": item.link.text,
                        "source": "ET/BS",
                        "is_international": False,
                        "published_at": pub_date or datetime.now(timezone.utc)
                    }
                    
                    # Filter out already-sent news if requested
                    if filter_sent and self.db and self.db.is_news_sent(news_item['headline'], news_item['link']):
                        continue
                    
                    news_items.append(news_item)
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return news_items

    def get_global_news(self):
        """Scrapes global finance headlines if enabled."""
        if not self.include_international:
            return []
        
        # Yahoo Finance RSS
        return self._scrape_rss("https://finance.yahoo.com/news/rssindex", "Yahoo", True, limit=10)

    def get_focus_news(self):
        """Specifically search for FOCUS_KEYWORDS using Google News RSS."""
        if not FOCUS_KEYWORDS:
            return []
        
        focus_news = []
        # Parse FOCUS_KEYWORDS (comma-separated string)
        keywords = [k.strip() for k in FOCUS_KEYWORDS.split(",") if k.strip()]
        
        for kw in keywords[:5]: # Limit to first 5 keywords
            # Google News RSS search URL
            url = f"https://news.google.com/rss/search?q={kw}+market+news&hl=en-IN&gl=IN&ceid=IN:en"
            focus_news.extend(self._scrape_rss(url, f"GNews:{kw}", False, limit=3))
            
        return focus_news
    
    def get_commodities_news(self):
        """Fetches global commodities news with emphasis on gold and silver."""
        commodities_news = []

        # Kitco RSS for precious metals
        kitco_feeds = [
            "https://www.kitco.com/rss/",
            "https://www.kitco.com/rss/gold.xml"
        ]

        for url in kitco_feeds:
            try:
                commodities_news.extend(self._scrape_rss(url, "Kitco", True, limit=5))
            except Exception as e:
                print(f"Error fetching from Kitco: {e}")

        # Add specific gold/silver news from Google News
        gold_news = self._scrape_rss(
            "https://news.google.com/rss/search?q=gold+price+commodity&hl=en-US&gl=US&ceid=US:en",
            "Gold News", True, limit=5
        )
        silver_news = self._scrape_rss(
            "https://news.google.com/rss/search?q=silver+price+commodity&hl=en-US&gl=US&ceid=US:en",
            "Silver News", True, limit=5
        )

        commodities_news.extend(gold_news)
        commodities_news.extend(silver_news)

        return commodities_news

    def get_stock_fundamentals(self, symbol):
        """Fetch fundamental data for a stock using yfinance."""
        try:
            # Try raw symbol first
            ticker_sym = symbol
            ticker = yf.Ticker(ticker_sym)
            info = ticker.info

            # If no info, try adding .NS for Indian stocks
            if not info or not info.get('regularMarketPrice'):
                ticker_sym = f"{symbol}.NS"
                ticker = yf.Ticker(ticker_sym)
                info = ticker.info

            if info:
                fundamentals = {
                    "pe": info.get('trailingPE') or info.get('forwardPE'),
                    "marketCap": info.get('marketCap'),
                    "volume": info.get('volume'),
                    "dividendYield": info.get('dividendYield'),
                    "beta": info.get('beta'),
                    "price": info.get('regularMarketPrice'),
                    "change": info.get('previousClose') and info.get('regularMarketPrice') and
                            ((info['regularMarketPrice'] - info['previousClose']) / info['previousClose'] * 100)
                }
                return fundamentals
        except Exception as e:
            print(f"Error fetching fundamentals for {symbol}: {e}")
        return None

    def get_stock_historical_data(self, symbol, period="1mo"):
        """Fetch historical price data for sparkline and growth calculations."""
        try:
            # Try raw symbol first
            ticker_sym = symbol
            ticker = yf.Ticker(ticker_sym)
            data = ticker.history(period=period)

            # If no data, try adding .NS for Indian stocks
            if data.empty:
                ticker_sym = f"{symbol}.NS"
                ticker = yf.Ticker(ticker_sym)
                data = ticker.history(period=period)

            if not data.empty:
                # Calculate growth for different periods
                current_price = data['Close'].iloc[-1]
                growth = {}

                if len(data) >= 5:
                    growth['day1'] = ((current_price - data['Close'].iloc[-2]) / data['Close'].iloc[-2]) * 100
                if len(data) >= 7:
                    growth['week1'] = ((current_price - data['Close'].iloc[-7]) / data['Close'].iloc[-7]) * 100
                if len(data) >= 30:
                    growth['month1'] = ((current_price - data['Close'].iloc[-30]) / data['Close'].iloc[-30]) * 100
                if len(data) >= 365:
                    growth['year1'] = ((current_price - data['Close'].iloc[-365]) / data['Close'].iloc[-365]) * 100

                # Sparkline data (last 10 points)
                sparkline = data['Close'].tail(10).tolist()

                return {
                    'growth': growth,
                    'sparkline': sparkline,
                    'current_price': current_price
                }
        except Exception as e:
            print(f"Error fetching historical data for {symbol}: {e}")
        return None

    def _scrape_rss(self, url, source_name, is_international, limit=5, filter_sent=True):
        news_items = []
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all('item')[:limit]
            for item in items:
                # Parse publication date if available
                pub_date = None
                if item.pubDate:
                    try:
                        pub_date = datetime.fromisoformat(item.pubDate.text.replace('Z', '+00:00'))
                    except:
                        pub_date = datetime.now(timezone.utc)
                
                news_item = {
                    "headline": item.title.text,
                    "link": item.link.text,
                    "source": source_name,
                    "is_international": is_international,
                    "published_at": pub_date or datetime.now(timezone.utc)
                }
                
                # Filter out already-sent news if requested
                if filter_sent and self.db and self.db.is_news_sent(news_item['headline'], news_item['link']):
                    continue
                
                news_items.append(news_item)
        except Exception as e:
            print(f"Error fetching news from {url}: {e}")
        return news_items

    def collect_all_data(self):
        """Combines all input for the AI Brain."""
        return {
            "moves": self.get_stock_movements(filter_significant=False), # Provide ALL prices to AI
            "local_news": self.get_indian_news(),
            "global_news": self.get_global_news() if self.include_international else [],
            "focus_news": self.get_focus_news(),
            "commodities_news": self.get_commodities_news() if self.include_international else []
        }
    
    def collect_india_data(self):
        """Collects India-specific data for India report."""
        thirty_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        # Get all news (with deduplication)
        all_local_news = self.get_indian_news(filter_sent=True)
        
        # Filter news from last 30 mins
        recent_local_news = [
            n for n in all_local_news 
            if n['published_at'] and n['published_at'] > thirty_mins_ago
        ]
        
        return {
            "moves": self.get_stock_movements(filter_significant=False),
            "local_news": all_local_news,
            "recent_news": recent_local_news,
            "focus_news": self.get_focus_news(),
            "commodities_news": self.get_commodities_news() if self.include_international else []
        }
    
    def collect_us_data(self):
        """Collects US/International data for US report."""
        # Focus news is India-specific, so exclude from US report to avoid overlap
        return {
            "moves": self.get_stock_movements(filter_significant=False),
            "global_news": self.get_global_news(),
            "focus_news": []  # Empty to avoid overlap with India report
        }
    
    def get_all_news_for_tracking(self):
        """Get all news items to mark as sent (without filtering)."""
        all_news = []
        all_news.extend(self.get_indian_news(filter_sent=False))
        if self.include_international:
            all_news.extend(self.get_global_news())
            all_news.extend(self.get_focus_news())
            all_news.extend(self.get_commodities_news())
        return all_news
