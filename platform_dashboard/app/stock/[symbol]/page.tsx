"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SparklineChart from "@/components/SparklineChart";

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState<any>(null);

  useEffect(() => {
    // Mock data for now - will be replaced with real data from Supabase
    const mockData = {
      symbol: symbol.toUpperCase(),
      price: 3845.50,
      change: 2.5,
      signal: "BUY" as "BUY" | "SELL" | "NEUTRAL",
      fundamentals: {
        pe: 28.5,
        marketCap: "14.5T",
        volume: "2.1M",
        eps: 135.2,
        bookValue: 890.5,
        dividend: 24.0,
        dividendYield: 0.62
      },
      growth: {
        day1: 2.5,
        week1: 3.2,
        month1: 5.1,
        year1: 12.3
      },
      sparklineData: [3800, 3820, 3810, 3830, 3845, 3835, 3840, 3850, 3848, 3845],
      recentNews: [
        {
          headline: `${symbol} reports strong Q4 results, beats expectations`,
          source: "Economic Times",
          date: "2 hours ago",
          sentiment: "positive"
        },
        {
          headline: `${symbol} announces new partnership in cloud computing`,
          source: "Business Standard",
          date: "5 hours ago",
          sentiment: "positive"
        },
        {
          headline: "Analysts maintain BUY rating on ${symbol}",
          source: "Moneycontrol",
          date: "1 day ago",
          sentiment: "neutral"
        }
      ],
      signalHistory: [
        { date: "2026-04-09", signal: "BUY", strength: 0.85 },
        { date: "2026-04-08", signal: "BUY", strength: 0.82 },
        { date: "2026-04-07", signal: "NEUTRAL", strength: 0.55 },
        { date: "2026-04-06", signal: "BUY", strength: 0.78 },
        { date: "2026-04-05", signal: "BUY", strength: 0.75 }
      ]
    };

    setTimeout(() => {
      setStockData(mockData);
      setLoading(false);
    }, 500);
  }, [symbol]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/4 mb-4" />
          <div className="h-64 bg-slate-900 rounded-xl" />
        </div>
      </main>
    );
  }

  const signalColors = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    SELL: "bg-rose-500/20 text-rose-400 border-rose-500/50",
    NEUTRAL: "bg-slate-500/20 text-slate-400 border-slate-500/50"
  };

  const changeColor = stockData.change >= 0 ? "text-emerald-400" : "text-rose-400";
  const changePrefix = stockData.change >= 0 ? "+" : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">{stockData.symbol}</h1>
            <p className="text-slate-400 mt-2">Stock Details & Analysis</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase border ${signalColors[stockData.signal as keyof typeof signalColors]}`}>
            {stockData.signal} SIGNAL
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm">Current Price</p>
              <p className="text-4xl font-bold">${stockData.price.toFixed(2)}</p>
              <p className={`text-xl font-semibold ${changeColor}`}>
                {changePrefix}{stockData.change.toFixed(2)}%
              </p>
            </div>
            <div className="h-32 w-64">
              <SparklineChart data={stockData.sparklineData} height={128} />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Growth Periods</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">1 Day</span>
              <span className={(stockData.growth.day1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {stockData.growth.day1 !== undefined ? `${(stockData.growth.day1 >= 0 ? "+" : "")}${stockData.growth.day1.toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">1 Week</span>
              <span className={(stockData.growth.week1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {stockData.growth.week1 !== undefined ? `${(stockData.growth.week1 >= 0 ? "+" : "")}${stockData.growth.week1.toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">1 Month</span>
              <span className={(stockData.growth.month1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {stockData.growth.month1 !== undefined ? `${(stockData.growth.month1 >= 0 ? "+" : "")}${stockData.growth.month1.toFixed(1)}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">1 Year</span>
              <span className={(stockData.growth.year1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {stockData.growth.year1 !== undefined ? `${(stockData.growth.year1 >= 0 ? "+" : "")}${stockData.growth.year1.toFixed(1)}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fundamentals */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold mb-4">Fundamentals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-slate-500 text-sm">P/E Ratio</p>
            <p className="text-xl font-bold">{stockData.fundamentals.pe}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Market Cap</p>
            <p className="text-xl font-bold">{stockData.fundamentals.marketCap}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Volume</p>
            <p className="text-xl font-bold">{stockData.fundamentals.volume}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">EPS</p>
            <p className="text-xl font-bold">{stockData.fundamentals.eps}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Book Value</p>
            <p className="text-xl font-bold">{stockData.fundamentals.bookValue}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Dividend</p>
            <p className="text-xl font-bold">{stockData.fundamentals.dividend}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Dividend Yield</p>
            <p className="text-xl font-bold">{stockData.fundamentals.dividendYield}%</p>
          </div>
        </div>
      </div>

      {/* Recent News */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <h3 className="text-lg font-semibold mb-4">Recent News</h3>
        <div className="space-y-3">
          {stockData.recentNews.map((news: any, index: number) => (
            <div key={index} className="border-b border-slate-800 pb-3 last:border-0">
              <p className="text-white font-medium">{news.headline}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-500 text-sm">{news.source}</span>
                <span className="text-slate-500 text-sm">{news.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal History */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4">Signal History</h3>
        <div className="space-y-2">
          {stockData.signalHistory.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0">
              <span className="text-slate-400">{item.date}</span>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  item.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                  item.signal === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {item.signal}
                </span>
                <span className="text-slate-500 text-sm">Strength: {(item.strength * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
