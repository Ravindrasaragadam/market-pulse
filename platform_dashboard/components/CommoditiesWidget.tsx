"use client";

import { useState, useEffect } from 'react';

interface CommoditiesWidgetProps {
  watchlist?: string[];
}

export default function CommoditiesWidget({ watchlist = ['GC=F', 'SI=F'] }: CommoditiesWidgetProps) {
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for commodities - will be replaced with real data from API
    const mockData = {
      'GC=F': { price: 2345.50, change: 1.2 },
      'SI=F': { price: 28.35, change: -0.8 }
    };
    
    setTimeout(() => {
      setPrices(mockData);
      setLoading(false);
    }, 500);
  }, []);

  const commodityNames: Record<string, string> = {
    'GC=F': 'Gold',
    'SI=F': 'Silver'
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <span>💰</span> Commodities
      </h2>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {watchlist.map(symbol => {
            const data = prices[symbol];
            const name = commodityNames[symbol] || symbol;
            
            return (
              <div
                key={symbol}
                className="flex items-center justify-between bg-slate-800 p-4 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-white">{name}</div>
                  <div className="text-sm text-slate-500">{symbol}</div>
                </div>
                <div className="text-right">
                  {data ? (
                    <>
                      <div className="text-xl font-bold text-white">
                        ${data.price.toFixed(2)}
                      </div>
                      <div className={`text-sm font-medium ${data.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500">Loading...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
