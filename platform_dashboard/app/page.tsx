"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from 'react-markdown';
import SentimentPieChart from "@/components/SentimentPieChart";
import PriceMovementChart from "@/components/PriceMovementChart";
import SignalTrendChart from "@/components/SignalTrendChart";
import MarketMetrics from "@/components/MarketMetrics";
import CommoditiesWidget from "@/components/CommoditiesWidget";
import TradingViewWidget from "@/components/TradingViewWidget";
import StockGrid from "@/components/StockGrid";
import AISummary from "@/components/AISummary";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [market, setMarket] = useState<"INDIA" | "US">("INDIA");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Mock stock data for now - will be replaced with real data from database
  useEffect(() => {
    const indiaStocks = [
      {
        symbol: "TCS",
        price: 3845.50,
        change: 2.5,
        signal: "BUY" as const,
        sparklineData: [3800, 3820, 3810, 3830, 3845],
        fundamentals: { pe: 28.5, marketCap: "14.5T", volume: "2.1M" },
        growth: { day1: 2.5, week1: 3.2, month1: 5.1, year1: 12.3 }
      },
      {
        symbol: "INFY",
        price: 1425.30,
        change: -1.2,
        signal: "SELL" as const,
        sparklineData: [1450, 1440, 1435, 1430, 1425],
        fundamentals: { pe: 24.2, marketCap: "5.8T", volume: "8.5M" },
        growth: { day1: -1.2, week1: -0.8, month1: 2.1, year1: 8.5 }
      },
      {
        symbol: "RELIANCE",
        price: 2580.75,
        change: 0.8,
        signal: "NEUTRAL" as const,
        sparklineData: [2570, 2575, 2578, 2580, 2580],
        fundamentals: { pe: 22.8, marketCap: "17.2T", volume: "5.3M" },
        growth: { day1: 0.8, week1: 1.5, month1: 3.2, year1: 15.8 }
      },
      {
        symbol: "HDFC",
        price: 1678.90,
        change: 1.5,
        signal: "BUY" as const,
        sparklineData: [1660, 1665, 1670, 1675, 1678],
        fundamentals: { pe: 19.5, marketCap: "9.8T", volume: "3.2M" },
        growth: { day1: 1.5, week1: 2.1, month1: 4.5, year1: 18.2 }
      },
      {
        symbol: "ICICI",
        price: 1085.40,
        change: -0.5,
        signal: "NEUTRAL" as const,
        sparklineData: [1090, 1088, 1086, 1085, 1085],
        fundamentals: { pe: 18.2, marketCap: "6.2T", volume: "7.8M" },
        growth: { day1: -0.5, week1: 0.3, month1: 2.8, year1: 22.5 }
      },
      {
        symbol: "SBIN",
        price: 785.60,
        change: 3.2,
        signal: "BUY" as const,
        sparklineData: [760, 770, 775, 780, 785],
        fundamentals: { pe: 12.5, marketCap: "7.0T", volume: "12.5M" },
        growth: { day1: 3.2, week1: 4.5, month1: 8.2, year1: 35.8 }
      },
      {
        symbol: "WIPRO",
        price: 456.80,
        change: -2.1,
        signal: "SELL" as const,
        sparklineData: [470, 465, 460, 458, 456],
        fundamentals: { pe: 21.5, marketCap: "2.5T", volume: "15.2M" },
        growth: { day1: -2.1, week1: -3.5, month1: -5.2, year1: -8.5 }
      },
      {
        symbol: "TATASTEEL",
        price: 145.25,
        change: 1.8,
        signal: "BUY" as const,
        sparklineData: [142, 143, 144, 145, 145],
        fundamentals: { pe: 15.2, marketCap: "1.8T", volume: "8.5M" },
        growth: { day1: 1.8, week1: 3.2, month1: 6.5, year1: 28.5 }
      }
    ];

    const usStocks = [
      {
        symbol: "AAPL",
        price: 178.50,
        change: 1.2,
        signal: "BUY" as const,
        sparklineData: [175, 176, 177, 178, 178],
        fundamentals: { pe: 28.5, marketCap: "2.8T", volume: "52.1M" },
        growth: { day1: 1.2, week1: 2.8, month1: 4.5, year1: 15.3 }
      },
      {
        symbol: "MSFT",
        price: 425.30,
        change: 0.8,
        signal: "BUY" as const,
        sparklineData: [420, 422, 424, 425, 425],
        fundamentals: { pe: 35.2, marketCap: "3.2T", volume: "22.5M" },
        growth: { day1: 0.8, week1: 1.5, month1: 3.2, year1: 28.5 }
      },
      {
        symbol: "GOOGL",
        price: 156.75,
        change: -0.5,
        signal: "NEUTRAL" as const,
        sparklineData: [158, 157, 157, 156, 156],
        fundamentals: { pe: 24.8, marketCap: "2.0T", volume: "18.3M" },
        growth: { day1: -0.5, week1: 0.3, month1: 2.1, year1: 18.2 }
      },
      {
        symbol: "NVDA",
        price: 895.60,
        change: 3.5,
        signal: "BUY" as const,
        sparklineData: [870, 880, 885, 890, 895],
        fundamentals: { pe: 65.5, marketCap: "2.2T", volume: "45.2M" },
        growth: { day1: 3.5, week1: 5.2, month1: 12.5, year1: 185.3 }
      },
      {
        symbol: "TSLA",
        price: 245.40,
        change: -2.1,
        signal: "SELL" as const,
        sparklineData: [255, 250, 248, 246, 245],
        fundamentals: { pe: 42.2, marketCap: "780B", volume: "112.5M" },
        growth: { day1: -2.1, week1: -4.5, month1: -8.2, year1: -15.8 }
      },
      {
        symbol: "AMZN",
        price: 178.90,
        change: 1.8,
        signal: "BUY" as const,
        sparklineData: [175, 176, 177, 178, 178],
        fundamentals: { pe: 58.5, marketCap: "1.9T", volume: "35.2M" },
        growth: { day1: 1.8, week1: 3.2, month1: 6.5, year1: 42.5 }
      },
      {
        symbol: "META",
        price: 505.25,
        change: 2.2,
        signal: "BUY" as const,
        sparklineData: [495, 498, 500, 502, 505],
        fundamentals: { pe: 32.8, marketCap: "1.3T", volume: "18.5M" },
        growth: { day1: 2.2, week1: 4.5, month1: 8.5, year1: 125.3 }
      },
      {
        symbol: "AMD",
        price: 185.80,
        change: 4.2,
        signal: "BUY" as const,
        sparklineData: [175, 178, 180, 183, 185],
        fundamentals: { pe: 45.2, marketCap: "300B", volume: "65.2M" },
        growth: { day1: 4.2, week1: 8.5, month1: 15.2, year1: 95.8 }
      }
    ];

    setStocks(market === "INDIA" ? indiaStocks : usStocks);
  }, [market]);
  
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

  const filteredStocks = stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search stocks by symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
            🔍
          </span>
        </div>
      </header>

      {/* TradingView Widget at top */}
      <div className="mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <TradingViewWidget />
      </div>

      {/* Stock Grid - Main Feature */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          📈 {market === "INDIA" ? "Indian" : "US"} Watchlist Stocks
        </h2>
        <StockGrid stocks={filteredStocks} />
      </div>

      {/* AI Summary */}
      <div className="mb-8">
        <AISummary market={market} />
      </div>

      {/* Commodities Widget */}
      <div className="mb-8">
        <CommoditiesWidget />
      </div>
    </main>
  );
}
