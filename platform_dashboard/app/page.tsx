"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CommoditiesCorner from "@/components/CommoditiesCorner";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockGrid from "@/components/StockGrid";
import AIMarketSummary from "@/components/AIMarketSummary";
import AIStockSummary from "@/components/AIStockSummary";
import StockAlerts from "@/components/StockAlerts";
import StockSearch from "@/components/StockSearch";
import LiveNews from "@/components/LiveNews";

interface WatchlistStock {
  symbol: string;
  name: string;
  sector: string;
  marketCapCategory: string;
  priority: number;
  latestSignal: string;
  latestReason: string;
  alertCount: number;
  market: 'INDIA' | 'US';
  price: number;
  change: number;
  changePercent: number;
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [indiaStocks, setIndiaStocks] = useState<WatchlistStock[]>([]);
  const [usStocks, setUsStocks] = useState<WatchlistStock[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [market, setMarket] = useState<"INDIA" | "US">("INDIA");
  const [stats, setStats] = useState({ total: 0, india: 0, us: 0 });
  const [liveNews, setLiveNews] = useState<any[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { data, error: sbError } = await supabase
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (sbError) throw sbError;
        // Filter to show only relevant market reports
        const relevantAlerts = (data || []).filter(alert => 
          alert.symbol === 'INDIA_MARKET' || 
          alert.symbol === 'US_MARKET' ||
          alert.symbol === 'DAILY_SUMMARY'
        );
        setAlerts(relevantAlerts);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message || "Failed to connect to Supabase. Check your environment variables.");
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  // Fetch live prices for symbols
  const fetchLivePrices = async (symbols: string[]) => {
    if (symbols.length === 0) return;
    
    setPricesLoading(true);
    try {
      const response = await fetch(`/api/prices/live?symbols=${symbols.join(',')}`);
      const data = await response.json();
      
      if (data.prices) {
        setStocks(prevStocks => 
          prevStocks.map(stock => {
            const priceData = data.prices[stock.symbol];
            if (priceData) {
              return {
                ...stock,
                price: priceData.price,
                change: priceData.change,
                changePercent: priceData.changePercent
              };
            }
            return stock;
          })
        );
      }
    } catch (err) {
      console.error("Price fetch error:", err);
    } finally {
      setPricesLoading(false);
    }
  };

  // Fetch user's watchlist
  const fetchWatchlist = async () => {
    try {
      const response = await fetch('/api/watchlist');
      const data = await response.json();
      
      if (data.watchlist) {
        setWatchlist(data.watchlist);
        setIndiaStocks(data.indiaStocks || []);
        setUsStocks(data.usStocks || []);
        setStats(data.stats || { total: 0, india: 0, us: 0 });
        setWatchlistSymbols(data.watchlist.map((item: WatchlistStock) => item.symbol));
        
        // Transform watchlist to stock format for StockGrid
        const stockData = data.watchlist.map((item: WatchlistStock) => ({
          symbol: item.symbol,
          name: item.name,
          price: 0, // Will be fetched from live API
          change: 0,
          changePercent: 0,
          signal: item.latestSignal || "NEUTRAL",
          sector: item.sector,
          alertCount: item.alertCount,
          market: item.market
        }));
        
        setStocks(stockData);
        
        // Fetch live prices after setting stocks
        fetchLivePrices(data.watchlist.map((item: WatchlistStock) => item.symbol));
      }
    } catch (err) {
      console.error("Watchlist fetch error:", err);
    }
  };

  // Fetch live news
  const fetchLiveNews = async () => {
    try {
      const response = await fetch(`/api/news/live?market=${market.toLowerCase()}`);
      const data = await response.json();
      
      if (data.news) {
        setLiveNews(data.news);
      }
    } catch (err) {
      console.error("News fetch error:", err);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    fetchLiveNews();
    
    // Refresh prices every 60 seconds
    const priceInterval = setInterval(() => {
      if (watchlistSymbols.length > 0) {
        fetchLivePrices(watchlistSymbols);
      }
    }, 60000);
    
    // Refresh news every 5 minutes
    const newsInterval = setInterval(() => {
      fetchLiveNews();
    }, 5 * 60 * 1000);
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(newsInterval);
    };
  }, []);
  
  // Update prices when market tab changes
  useEffect(() => {
    const symbolsToFetch = market === 'INDIA' 
      ? indiaStocks.map(s => s.symbol)
      : usStocks.map(s => s.symbol);
    
    if (symbolsToFetch.length > 0) {
      fetchLivePrices(symbolsToFetch);
    }
  }, [market]);

  const handleAddToWatchlist = (symbol: string) => {
    // Refresh watchlist after adding
    fetchWatchlist();
  };
  
  const filteredAlerts = alerts.filter(alert => {
    if (filterType === "ALL") return true;
    return alert.symbol === filterType;
  });
  
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "strength") {
      return (b.strength || 0) - (a.strength || 0);
    }
    return 0;
  });

  // Filter stocks by selected market (only show India stocks for now per user request)
  const displayStocks = stocks.filter((stock: WatchlistStock) => stock.market === 'INDIA');
  const indiaStockSymbols = indiaStocks.map(s => s.symbol);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <header className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Market Pulse
            </h1>
            <p className="text-slate-400 mt-2">Market Intelligence & Signal Hub</p>
          </div>
          <div className="flex gap-4 items-center">
            {/* Market Toggle */}
            <div className="flex bg-slate-900 rounded-lg border border-slate-800 p-1">
              <button
                onClick={() => setMarket("INDIA")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  market === "INDIA"
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇮🇳 India
              </button>
              <button
                onClick={() => setMarket("US")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  market === "US"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                🇺🇸 US
              </button>
            </div>
            <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <span className="text-sm font-medium text-slate-500 block uppercase">Market Status</span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">● LIVE</span>
                {lastUpdated && (
                  <span className="text-slate-500 text-xs">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Search & Add */}
        <div className="mt-4">
          <StockSearch 
            onAddToWatchlist={handleAddToWatchlist}
            existingWatchlist={watchlistSymbols}
          />
        </div>
      </header>

      {/* TradingView Widget at top */}
      <div className="mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <TradingViewWidget />
      </div>

      {/* Stock Grid - Main Feature */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            📈 {market === 'INDIA' ? '🇮🇳 Indian Stocks' : '🇺🇸 US Stocks'}
            <span className="text-sm font-normal text-slate-400">
              ({market === 'INDIA' ? stats.india : stats.us} stocks)
            </span>
            <span className="text-xs font-normal text-slate-500 ml-2">
              (Total: {stats.total})
            </span>
          </h2>
          {watchlist.length === 0 && (
            <p className="text-sm text-slate-400">
              Search and add stocks to build your watchlist
            </p>
          )}
        </div>
        
        {displayStocks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center">
            <p className="text-slate-400 mb-4">
              No {market === 'INDIA' ? 'Indian' : 'US'} stocks in your watchlist
            </p>
            <p className="text-sm text-slate-500">
              Use the search above to add {market === 'INDIA' ? 'Indian' : 'US'} stocks
            </p>
          </div>
        ) : (
          <StockGrid stocks={displayStocks} />
        )}
      </div>

      {/* Stock-Level Alerts */}
      <div className="mb-8">
        <StockAlerts market={market} />
      </div>

      {/* Live News Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">📰 Live News</h2>
          <span className="text-xs text-slate-500">
            {liveNews.length > 0 && `Last updated: ${new Date().toLocaleTimeString()}`}
          </span>
        </div>
        <LiveNews news={liveNews} />
      </div>

      {/* AI Stock Sentiments */}
      <div className="mb-8">
        <AIStockSummary stocks={indiaStockSymbols} />
      </div>

      {/* AI Market Summary */}
      <div className="mb-8">
        <AIMarketSummary market={market} />
      </div>

      {/* Commodities Corner Widget - Fixed Position */}
      <CommoditiesCorner />
    </main>
  );
}
