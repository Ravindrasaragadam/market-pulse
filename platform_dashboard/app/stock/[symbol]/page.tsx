"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AIAnalyzer from "@/components/AIAnalyzer";

interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  market_cap_category: string;
}

interface StockAlert {
  id: string;
  created_at: string;
  signal_type: string;
  reasoning: string;
  signal_strength: number;
  metadata: any;
  fundamentals: any;
}

interface HistoricalData {
  date: string;
  price: number;
  change: number;
}

// Simple Sparkline Component
function SparklineChart({ data }: { data: HistoricalData[] }) {
  if (data.length < 2) return null;
  
  const width = 100;
  const height = 40;
  const padding = 2;
  
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - ((d.price - min) / range) * (height - 2 * padding) - padding;
    return `${x},${y}`;
  }).join(' ');
  
  const isPositive = data[data.length - 1].change >= 0;
  const color = isPositive ? '#10b981' : '#ef4444';
  
  return (
    <svg width="100%" height="80" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [loading, setLoading] = useState(true);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [priceData, setPriceData] = useState<{ price: number; change: number } | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);

  useEffect(() => {
    async function fetchStockData() {
      try {
        // Fetch stock info from database
        const { data: stockData, error: stockError } = await supabase
          .from('stock_symbols')
          .select('*')
          .eq('symbol', symbol.toUpperCase())
          .single();

        if (stockError) {
          console.error('Stock fetch error:', stockError);
        }
        setStockInfo(stockData);

        // Fetch alerts for this stock
        const { data: alertsData, error: alertsError } = await supabase
          .from('alerts')
          .select('*')
          .eq('stock_symbol', symbol.toUpperCase())
          .order('created_at', { ascending: false })
          .limit(10);

        if (alertsError) {
          console.error('Alerts fetch error:', alertsError);
        }
        setAlerts(alertsData || []);

        // Fetch real-time price from Yahoo Finance
        try {
          const response = await fetch(`/api/stocks/price?symbol=${symbol}`);
          if (response.ok) {
            const priceInfo = await response.json();
            setPriceData(priceInfo);
          }
        } catch (priceError) {
          console.error('Price fetch error:', priceError);
        }

        // Fetch historical data from alerts (growth_data)
        try {
          const { data: growthData, error: growthError } = await supabase
            .from('alerts')
            .select('metadata, created_at')
            .eq('stock_symbol', symbol.toUpperCase())
            .not('metadata', 'is', null)
            .order('created_at', { ascending: true })
            .limit(30);

          if (!growthError && growthData) {
            const historical: HistoricalData[] = growthData
              .filter((alert: any) => alert.metadata?.price)
              .map((alert: any) => ({
                date: alert.created_at,
                price: alert.metadata.price,
                change: alert.metadata.change || 0
              }));
            setHistoricalData(historical);
          }
        } catch (histError) {
          console.error('Historical data fetch error:', histError);
        }

      } catch (error) {
        console.error('Stock data fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStockData();
  }, [symbol]);

  // Get latest signal
  const latestAlert = alerts[0];
  const signal = latestAlert?.signal_type || 'NEUTRAL';
  const signalStrength = latestAlert?.signal_strength || 0.5;

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

  const signalColors: Record<string, string> = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    SELL: "bg-rose-500/20 text-rose-400 border-rose-500/50",
    NEUTRAL: "bg-slate-500/20 text-slate-400 border-slate-500/50"
  };

  const changeColor = (priceData?.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";
  const changePrefix = (priceData?.change ?? 0) >= 0 ? "+" : "";

  // Get fundamentals from latest alert
  const fundamentals = latestAlert?.fundamentals || {};

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
            <h1 className="text-4xl font-bold">{symbol.toUpperCase()}</h1>
            <p className="text-slate-400 mt-2">{stockInfo?.name || 'Stock Details'}</p>
            {stockInfo && (
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                  {stockInfo.exchange}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                  {stockInfo.sector}
                </span>
                {stockInfo.market_cap_category && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    stockInfo.market_cap_category === 'Large' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : stockInfo.market_cap_category === 'Mid'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {stockInfo.market_cap_category} Cap
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIAnalyzer(true)}
              className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 transition-colors text-sm font-medium"
            >
              🤖 AI Analyze
            </button>
            <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase border ${signalColors[signal] || signalColors.NEUTRAL}`}>
              {signal} SIGNAL
            </div>
          </div>
        </div>
      </div>

      {/* Price & Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm">Current Price</p>
              <p className="text-4xl font-bold">
                ₹{priceData?.price.toFixed(2) || '--.--'}
              </p>
              <p className={`text-xl font-semibold ${changeColor}`}>
                {priceData ? `${changePrefix}${priceData.change.toFixed(2)}%` : ''}
              </p>
            </div>
          </div>
          {/* Price History Chart */}
          <div className="h-80 w-full bg-slate-950 rounded-lg p-4 flex flex-col">
            <h3 className="text-amber-400 text-sm font-semibold mb-4">Price History (from our data)</h3>
            {historicalData.length > 0 ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-end">
                  <SparklineChart data={historicalData} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>{historicalData[0]?.date ? new Date(historicalData[0].date).toLocaleDateString() : ''}</span>
                  <span>{historicalData.length} data points</span>
                  <span>{historicalData[historicalData.length - 1]?.date ? new Date(historicalData[historicalData.length - 1].date).toLocaleDateString() : ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-800">
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Lowest</div>
                    <div className="text-sm font-semibold text-red-400">
                      ₹{Math.min(...historicalData.map(d => d.price)).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Average</div>
                    <div className="text-sm font-semibold text-amber-400">
                      ₹{(historicalData.reduce((a, b) => a + b.price, 0) / historicalData.length).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">Highest</div>
                    <div className="text-sm font-semibold text-emerald-400">
                      ₹{Math.max(...historicalData.map(d => d.price)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-slate-400 mb-2">No historical chart data available</div>
                  <div className="text-sm text-slate-500">Chart data will appear as alerts are generated</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Signal Info */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Current Signal</h3>
            <div className={`p-4 rounded-lg border ${signalColors[signal] || signalColors.NEUTRAL}`}>
              <div className="text-2xl font-bold mb-2">{signal}</div>
              <div className="text-sm">Strength: {(signalStrength * 100).toFixed(0)}%</div>
              {latestAlert?.reasoning && (
                <p className="text-sm mt-3 text-slate-300">{latestAlert.reasoning}</p>
              )}
            </div>
          </div>

          {/* Fundamentals */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Fundamentals</h3>
            <div className="space-y-3">
              {fundamentals.pe && (
                <div className="flex justify-between">
                  <span className="text-slate-400">P/E Ratio</span>
                  <span className="font-medium">{fundamentals.pe}</span>
                </div>
              )}
              {fundamentals.market_cap && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Market Cap</span>
                  <span className="font-medium">{fundamentals.market_cap}</span>
                </div>
              )}
              {fundamentals.eps && (
                <div className="flex justify-between">
                  <span className="text-slate-400">EPS</span>
                  <span className="font-medium">{fundamentals.eps}</span>
                </div>
              )}
              {fundamentals.book_value && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Book Value</span>
                  <span className="font-medium">{fundamentals.book_value}</span>
                </div>
              )}
              {fundamentals.dividend_yield && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Div Yield</span>
                  <span className="font-medium">{fundamentals.dividend_yield}%</span>
                </div>
              )}
              {!fundamentals.pe && !fundamentals.market_cap && (
                <p className="text-sm text-slate-500">Fundamentals not available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signal History */}
      {alerts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
          <h3 className="text-lg font-semibold mb-4">Signal History</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0">
                <span className="text-slate-400">
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    alert.signal_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                    alert.signal_type === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {alert.signal_type}
                  </span>
                  <span className="text-slate-500 text-sm">
                    Strength: {(alert.signal_strength * 100).toFixed(0)}%
                  </span>
                  {alert.stop_loss && (
                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                      SL: {alert.stop_loss}
                    </span>
                  )}
                  {alert.target && (
                    <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                      TGT: {alert.target}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analyzer Popup */}
      {showAIAnalyzer && (
        <AIAnalyzer 
          symbol={symbol.toUpperCase()} 
          onClose={() => setShowAIAnalyzer(false)} 
        />
      )}
    </main>
  );
}
