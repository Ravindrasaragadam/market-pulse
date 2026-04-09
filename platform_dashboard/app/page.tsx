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

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    const mockStocks = [
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
    setStocks(mockStocks);
  }, []);
  
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

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Market Pulse
          </h1>
          <p className="text-slate-400 mt-2">Market Intelligence & Signal Hub</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-sm font-medium text-slate-500 block uppercase">Market Status</span>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">● LIVE (NSE/BSE)</span>
              {lastUpdated && (
                <span className="text-slate-500 text-xs">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* TradingView Widget at top */}
      <div className="mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <TradingViewWidget />
      </div>

      {/* Market Metrics */}
      <div className="mb-8">
        <MarketMetrics alerts={alerts} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Report Distribution</h2>
          <SentimentPieChart alerts={alerts} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Reports by Type</h2>
          <PriceMovementChart alerts={alerts} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Report Types</h2>
          <SignalTrendChart alerts={alerts} />
        </div>
      </div>

      {/* Stock Grid - Main Feature */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          📈 Watchlist Stocks
        </h2>
        <StockGrid stocks={stocks} />
      </div>

      {/* Commodities Widget */}
      <div className="mb-8">
        <CommoditiesWidget />
      </div>
    </main>
  );
}
