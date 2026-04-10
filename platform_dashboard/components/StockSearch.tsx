"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  market_cap_category: string;
  exchange?: string;
  is_new?: boolean; // Flag for newly discovered stocks from Yahoo Finance
}

interface SearchResponse {
  stocks: Stock[];
  source: {
    local: number;
    yahoo: number;
  };
}

interface StockSearchProps {
  onAddToWatchlist?: (symbol: string) => void;
  existingWatchlist?: string[];
}

export default function StockSearch({ onAddToWatchlist, existingWatchlist = [] }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [searchSource, setSearchSource] = useState<{ local: number; yahoo: number } | null>(null);

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Search stocks
  const searchStocks = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setSearchSource(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
        const data: SearchResponse = await response.json();
        
        if (data.stocks) {
          setResults(data.stocks);
          setSearchSource(data.source);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchStocks(query);
  }, [query, searchStocks]);

  const handleAddToWatchlist = async (symbol: string) => {
    setAddingSymbol(symbol);
    try {
      const response = await fetch('/api/watchlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, priority: 5 })
      });

      const data = await response.json();
      
      if (data.success) {
        onAddToWatchlist?.(symbol);
        setQuery("");
        setResults([]);
        setShowDropdown(false);
      } else {
        console.error("Failed to add:", data.error);
      }
    } catch (error) {
      console.error("Add error:", error);
    } finally {
      setAddingSymbol(null);
    }
  };

  const isInWatchlist = (symbol: string) => existingWatchlist.includes(symbol);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search stocks by symbol or name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            "🔍"
          )}
        </span>
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-md border border-amber-500/20 rounded-xl shadow-2xl shadow-amber-500/10 max-h-96 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Source Info */}
          {searchSource && (searchSource.yahoo > 0 || searchSource.local === 0) && (
            <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/10 text-xs text-amber-400/80 flex justify-between items-center">
              <span>
                {searchSource.local > 0 ? `${searchSource.local} from database` : 'Searching live markets...'}
                {searchSource.yahoo > 0 && ` • ${searchSource.yahoo} new from Yahoo Finance`}
              </span>
            </div>
          )}
          
          {results.map((stock) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between p-4 border-b border-amber-500/5 last:border-0 hover:bg-amber-500/5 transition-all duration-200 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/stock/${stock.symbol}`}
                    onClick={() => setShowDropdown(false)}
                    className="font-bold text-white hover:text-amber-400 transition-colors duration-200"
                  >
                    {stock.symbol}
                  </Link>
                  {stock.is_new ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      🆕 New
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stock.market_cap_category === 'Large' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : stock.market_cap_category === 'Mid'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {stock.market_cap_category}
                    </span>
                  )}
                  {stock.exchange && (
                    <span className="text-xs text-slate-500">{stock.exchange}</span>
                  )}
                </div>
                <Link 
                  href={`/stock/${stock.symbol}`}
                  onClick={() => setShowDropdown(false)}
                  className="block text-sm text-slate-400 hover:text-amber-300 transition-colors truncate"
                >
                  {stock.name}
                </Link>
                <p className="text-xs text-slate-500">{stock.is_new ? 'Auto-discovered • Info will update' : stock.sector}</p>
              </div>
              
              <button
                onClick={() => handleAddToWatchlist(stock.symbol)}
                disabled={isInWatchlist(stock.symbol) || addingSymbol === stock.symbol}
                className={`ml-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isInWatchlist(stock.symbol)
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                    : addingSymbol === stock.symbol
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
                }`}
              >
                {isInWatchlist(stock.symbol) 
                  ? '✓ Added' 
                  : addingSymbol === stock.symbol 
                  ? 'Adding...' 
                  : '+ Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-400 text-center">
          No stocks found for &quot;{query}&quot;
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
