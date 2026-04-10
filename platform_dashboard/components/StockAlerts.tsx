"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface StockAlert {
  id: string;
  stock_symbol: string;
  stock_name?: string;
  signal_type: string;
  reasoning: string;
  focus_areas?: string[];
  created_at: string;
  signal_strength?: number;
}

interface StockAlertsProps {
  market: "INDIA" | "US";
}

export default function StockAlerts({ market }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStockAlerts() {
      try {
        const symbolPrefix = market === "INDIA" ? "INDIA" : "US";
        
        // Fetch alerts with stock symbol info
        const { data, error } = await supabase
          .from("alerts")
          .select(`
            *,
            stock_symbols:stock_symbol (
              name,
              sector
            )
          `)
          .or(`symbol.eq.${symbolPrefix}_STOCK,symbol.eq.${symbolPrefix}_MARKET`)
          .not("stock_symbol", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        // Transform data to include stock names and focus areas
        const transformedAlerts = (data || []).map((alert: any) => ({
          id: alert.id,
          stock_symbol: alert.stock_symbol,
          stock_name: alert.stock_symbols?.name || alert.stock_symbol,
          signal_type: alert.signal_type || "NEUTRAL",
          reasoning: alert.reasoning || "",
          focus_areas: alert.metadata?.focus_areas || [alert.stock_symbols?.sector].filter(Boolean),
          signal_strength: alert.signal_strength,
          created_at: alert.created_at
        }));

        setAlerts(transformedAlerts);
      } catch (err: any) {
        console.error("Error fetching stock alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStockAlerts();
  }, [market]);

  const getSignalColor = (signal: string) => {
    switch (signal.toUpperCase()) {
      case "BUY":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "SELL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  const getSignalEmoji = (signal: string) => {
    switch (signal.toUpperCase()) {
      case "BUY":
        return "📈";
      case "SELL":
        return "📉";
      default:
        return "➖";
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock Alerts
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock Alerts
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
        </h2>
        <p className="text-slate-400">
          No stock alerts yet. The backend will generate stock-level alerts when it identifies specific opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 p-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.1)]">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🚨 Stock Alerts
        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
          {market === "INDIA" ? "India" : "US"}
        </span>
      </h2>
      <div className="space-y-4">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg border-l-4 border-amber-500 hover:border-amber-400 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Stock Symbol and Name */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <Link 
                  href={`/stock/${alert.stock_symbol}`}
                  className="text-lg font-bold text-white hover:text-amber-400 transition-colors duration-200"
                >
                  {alert.stock_symbol}
                </Link>
                {alert.stock_name && alert.stock_name !== alert.stock_symbol && (
                  <p className="text-sm text-slate-400">{alert.stock_name}</p>
                )}
              </div>
              
              {/* Signal Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getSignalColor(alert.signal_type)}`}>
                {getSignalEmoji(alert.signal_type)} {alert.signal_type}
              </div>
            </div>

            {/* Reason */}
            <p className="text-slate-300 text-sm mb-3 leading-relaxed">
              {alert.reasoning}
            </p>

            {/* Focus Area Tags */}
            {alert.focus_areas && alert.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {alert.focus_areas.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs bg-slate-700/80 text-amber-400 px-2 py-1 rounded border border-amber-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-slate-500 flex justify-between items-center">
              <span>{new Date(alert.created_at).toLocaleString()}</span>
              {alert.signal_strength && (
                <span className="text-amber-400/80 font-medium">
                  Confidence: {Math.round(alert.signal_strength * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
