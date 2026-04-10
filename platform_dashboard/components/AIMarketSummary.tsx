"use client";

import { useEffect, useState } from "react";

interface AIMarketSummaryProps {
  market: "INDIA" | "US";
}

export default function AIMarketSummary({ market }: AIMarketSummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    async function fetchSummary() {
      try {
        // Use an index stock to get market sentiment
        const indexSymbol = market === "INDIA" ? "NIFTY50" : "SPX";
        
        const response = await fetch(`/api/stocks/analyze?symbol=${indexSymbol}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.analysis) {
            setSummary(data.analysis.sentiment || "Market analysis available");
            setTimestamp(data.timestamp || new Date().toISOString());
          } else {
            setSummary(`${market} market is showing mixed signals. Analysis will be updated shortly.`);
          }
        } else {
          setSummary(`Click on any stock above to see detailed AI analysis with buy/sell signals, fundamentals, and news.`);
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setSummary("Market analysis available on individual stock pages.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [market]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🤖 AI Market Intelligence
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🤖 AI Market Intelligence
        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
          {market === "INDIA" ? "🇮🇳 Nifty 50" : "🇺🇸 S&P 500"}
        </span>
      </h2>
      <div className="text-slate-300 text-sm leading-relaxed">
        <p>{summary}</p>
        {timestamp && (
          <p className="text-xs text-slate-500 mt-3">
            Last updated: {new Date(timestamp).toLocaleString()}
          </p>
        )}
      </div>
      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
        <p className="text-xs text-slate-400">
          💡 <strong>Tip:</strong> Click on any stock card above to see detailed AI analysis with buy/sell signals, 
          fundamentals, technical indicators, and latest news.
        </p>
      </div>
    </div>
  );
}
