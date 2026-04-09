"use client";

import { useState, useEffect } from 'react';

interface CommodityPrice {
  price: number;
  change: number;
}

export default function CommoditiesCorner() {
  const [prices, setPrices] = useState<Record<string, CommodityPrice>>({});
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function fetchCommodities() {
      try {
        const response = await fetch('/api/commodities');
        if (response.ok) {
          const data = await response.json();
          setPrices(data);
        }
      } catch (error) {
        console.error('Error fetching commodities:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCommodities();
    // Refresh every 60 seconds
    const interval = setInterval(fetchCommodities, 60000);
    return () => clearInterval(interval);
  }, []);

  const gold = prices['GC=F'];
  const silver = prices['SI=F'];

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-slate-900 border border-slate-800 rounded-lg p-3 shadow-xl z-40">
        <div className="animate-pulse flex gap-4">
          <div className="h-8 w-20 bg-slate-800 rounded" />
          <div className="h-8 w-20 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Collapsed View - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg p-3 shadow-xl transition-all"
      >
        <div className="flex items-center gap-4">
          {/* Gold */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">🥇 Gold</span>
            {gold ? (
              <div className="text-right">
                <span className="text-sm font-bold text-white">${gold.price.toFixed(0)}</span>
                <span className={`text-xs ml-1 ${gold.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {gold.change >= 0 ? '+' : ''}{gold.change.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">--</span>
            )}
          </div>

          <div className="w-px h-6 bg-slate-700" />

          {/* Silver */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">🥈 Silver</span>
            {silver ? (
              <div className="text-right">
                <span className="text-sm font-bold text-white">${silver.price.toFixed(2)}</span>
                <span className={`text-xs ml-1 ${silver.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {silver.change >= 0 ? '+' : ''}{silver.change.toFixed(1)}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">--</span>
            )}
          </div>

          <span className="text-slate-600 text-xs">{isExpanded ? '▼' : '▲'}</span>
        </div>
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Precious Metals</h3>
          
          {gold && (
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <div>
                <span className="text-white font-medium">Gold</span>
                <span className="text-xs text-slate-500 block">GC=F</span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">${gold.price.toFixed(2)}</span>
                <span className={`text-xs block ${gold.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {gold.change >= 0 ? '+' : ''}{gold.change.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {silver && (
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="text-white font-medium">Silver</span>
                <span className="text-xs text-slate-500 block">SI=F</span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">${silver.price.toFixed(2)}</span>
                <span className={`text-xs block ${silver.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {silver.change >= 0 ? '+' : ''}{silver.change.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600 mt-3">
            Updates every 60 seconds
          </p>
        </div>
      )}
    </div>
  );
}
