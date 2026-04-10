"use client";

import { useEffect, useState } from "react";

interface StockSentiment {
  symbol: string;
  name: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  sentiment: string;
}

interface AIStockSummaryProps {
  stocks: string[]; // List of stock symbols to analyze
}

export default function AIStockSummary({ stocks }: AIStockSummaryProps) {
  const [sentiments, setSentiments] = useState<StockSentiment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSentiments() {
      try {
        // Fetch analysis for each stock (will use cache if available)
        const promises = stocks.slice(0, 10).map(async (symbol) => {
          try {
            const response = await fetch(`/api/stocks/analyze?symbol=${symbol}`);
            if (response.ok) {
              const data = await response.json();
              return {
                symbol,
                name: symbol,
                signal: data.analysis?.signal || 'NEUTRAL',
                confidence: data.analysis?.confidence || 50,
                sentiment: data.analysis?.sentiment || 'neutral',
              };
            }
          } catch {
            // Return neutral if fetch fails
          }
          return {
            symbol,
            name: symbol,
            signal: 'NEUTRAL',
            confidence: 50,
            sentiment: 'neutral',
          };
        });

        const results = await Promise.all(promises);
        setSentiments(results);
      } catch (error) {
        console.error('Error fetching sentiments:', error);
      } finally {
        setLoading(false);
      }
    }

    if (stocks.length > 0) {
      fetchSentiments();
    } else {
      setLoading(false);
    }
  }, [stocks]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">📊 Stock Sentiments</h2>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (sentiments.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">📊 Stock Sentiments</h2>
        <p className="text-slate-400">Add stocks to your watchlist to see AI sentiments.</p>
      </div>
    );
  }

  const buyCount = sentiments.filter(s => s.signal === 'BUY').length;
  const sellCount = sentiments.filter(s => s.signal === 'SELL').length;
  const neutralCount = sentiments.filter(s => s.signal === 'NEUTRAL').length;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">📊 Stock Sentiments</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">{buyCount} BUY</span>
          <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400">{sellCount} SELL</span>
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">{neutralCount} HOLD</span>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sentiments.map((stock) => (
          <a
            key={stock.symbol}
            href={`/stock/${stock.symbol}`}
            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                stock.signal === 'BUY' ? 'bg-emerald-400' :
                stock.signal === 'SELL' ? 'bg-rose-400' :
                'bg-amber-400'
              }`} />
              <span className="font-medium">{stock.symbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                stock.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                stock.signal === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {stock.signal}
              </span>
              <span className="text-xs text-slate-500">{stock.confidence}%</span>
            </div>
          </a>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Based on AI analysis (cached 2-3 hours). Click any stock for detailed analysis.
      </p>
    </div>
  );
}
