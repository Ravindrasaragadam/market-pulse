"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

interface AIAnalysis {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  highlights: string[];
  sentiment: string;
  investment_horizon: 'SHORT_TERM' | 'LONG_TERM';
  stop_loss: number;
  target: number;
  fundamentals_summary: {
    pe_ratio: number;
    eps: number;
    book_value: number;
    dividend_yield: number;
    roe: number;
    debt_equity: number;
  };
  technical_summary: {
    rsi: number;
    trend: string;
    support: number;
    resistance: number;
  };
  recent_news_summary: string;
  related_stocks: string[];
  timestamp: string;
}

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
  sentiment: string;
  mentioned_stocks: string[];
}

interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  market_cap_category: string;
}

export default function StockDetailClient() {
  const params = useParams();
  const symbol = params.symbol as string;
  
  const [loading, setLoading] = useState(true);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [relatedStocks, setRelatedStocks] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Check if stock is in watchlist
  const checkWatchlistStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('stock_symbol', symbol.toUpperCase())
        .eq('is_active', true)
        .single();

      setIsInWatchlist(!!data && !error);
    } catch (error) {
      console.error('Watchlist check error:', error);
    }
  }, [symbol]);

  // Toggle watchlist status
  const toggleWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const response = await fetch(`/api/watchlist?symbol=${symbol}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setIsInWatchlist(false);
        }
      } else {
        // Add to watchlist
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, priority: 5 }),
        });
        
        if (response.ok) {
          setIsInWatchlist(true);
        }
      }
    } catch (error) {
      console.error('Watchlist toggle error:', error);
    } finally {
      setWatchlistLoading(false);
    }
  };

  // Fetch real-time price
  const fetchPrice = useCallback(async () => {
    try {
      const response = await fetch(`/api/stocks/realtime?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setPriceData(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Price fetch error:', error);
    }
  }, [symbol]);

  // Try to get saved fundamentals from database
  const fetchSavedFundamentals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stock_fundamentals')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (data && !error) {
        // Check if still valid (not expired)
        const expiresAt = new Date(data.expires_at).getTime();
        if (expiresAt > Date.now()) {
          // Convert to AIAnalysis format
          const savedAnalysis: AIAnalysis = {
            signal: data.signal,
            confidence: data.confidence,
            highlights: data.highlights || [],
            sentiment: data.sentiment,
            investment_horizon: data.investment_horizon,
            stop_loss: data.stop_loss,
            target: data.target,
            fundamentals_summary: {
              pe_ratio: data.pe_ratio,
              eps: data.eps,
              book_value: data.book_value,
              dividend_yield: data.dividend_yield,
              roe: data.roe,
              debt_equity: data.debt_equity,
            },
            technical_summary: {
              rsi: data.rsi,
              trend: data.trend,
              support: data.support,
              resistance: data.resistance,
            },
            recent_news_summary: data.recent_news_summary,
            related_stocks: data.related_stocks || [],
            timestamp: data.analyzed_at,
          };
          setAiAnalysis(savedAnalysis);
          console.log('[StockDetail] Loaded saved fundamentals for', symbol);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error fetching saved fundamentals:', error);
      return false;
    }
  }, [symbol]);

  // Fetch AI analysis (with caching)
  const fetchAIAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    try {
      // First try saved fundamentals from database
      const hasSavedData = await fetchSavedFundamentals();
      if (hasSavedData) {
        setAnalysisLoading(false);
        return;
      }

      // Try API cache
      const cacheResponse = await fetch(`/api/stocks/analyze?symbol=${symbol}`);
      
      if (cacheResponse.ok) {
        const data = await cacheResponse.json();
        setAiAnalysis(data.analysis);
        setAnalysisLoading(false);
        return;
      }

      // If no cache, generate new
      const response = await fetch('/api/stocks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, market: detectMarket(symbol) }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setAnalysisLoading(false);
    }
  }, [symbol, fetchSavedFundamentals]);

  // Fetch news
  const fetchNews = useCallback(async () => {
    try {
      const response = await fetch(`/api/news/live?market=${detectMarket(symbol).toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        // Filter news mentioning this stock
        const filteredNews = data.news.filter((item: NewsItem) => 
          item.title.toLowerCase().includes(symbol.toLowerCase()) ||
          symbol.toLowerCase().split('.')[0].includes(item.title.toLowerCase().split(' ')[0])
        ).slice(0, 10);
        setNews(filteredNews);
      }
    } catch (error) {
      console.error('News fetch error:', error);
    }
  }, [symbol]);

  // Fetch stock info
  const fetchStockInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stock_symbols')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .single();

      if (data) {
        setStockInfo(data);
      }
    } catch (error) {
      console.error('Stock info error:', error);
    }
  }, [symbol]);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchPrice(),
        fetchAIAnalysis(),
        fetchNews(),
        fetchStockInfo(),
        checkWatchlistStatus(),
      ]);
      setLoading(false);
    };

    loadAll();
  }, [fetchPrice, fetchAIAnalysis, fetchNews, fetchStockInfo]);

  // Price polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  const changeColor = (priceData?.change ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";
  const changePrefix = (priceData?.change ?? 0) >= 0 ? "+" : "";
  const isIndian = detectMarket(symbol) === 'INDIA';
  const currency = isIndian ? '₹' : '$';

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

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">{symbol.toUpperCase()}</h1>
            <p className="text-slate-400 mt-2">{stockInfo?.name || 'Stock Details'}</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                {stockInfo?.exchange || (isIndian ? 'NSE' : 'NYSE/NASDAQ')}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400">
                {stockInfo?.sector || 'Unknown Sector'}
              </span>
              {stockInfo?.market_cap_category && (
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
          </div>
          
          {/* Price Display */}
          <div className="text-right">
            <p className="text-5xl font-bold">
              {currency}{priceData?.price.toFixed(2) || '--.--'}
            </p>
            <p className={`text-2xl font-semibold ${changeColor}`}>
              {changePrefix}{priceData?.change.toFixed(2)} ({changePrefix}{priceData?.changePercent.toFixed(2)}%)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Price Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-500 text-xs">Day Open</p>
          <p className="text-xl font-semibold">{currency}{priceData?.open.toFixed(2) || '--'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-500 text-xs">Day High</p>
          <p className="text-xl font-semibold text-emerald-400">{currency}{priceData?.dayHigh.toFixed(2) || '--'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-500 text-xs">Day Low</p>
          <p className="text-xl font-semibold text-rose-400">{currency}{priceData?.dayLow.toFixed(2) || '--'}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-slate-500 text-xs">Volume</p>
          <p className="text-xl font-semibold">{formatVolume(priceData?.volume || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - AI Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Analysis Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                🤖 AI Analysis
                {aiAnalysis && (
                  <span className="text-xs text-slate-500">
                    Generated: {new Date(aiAnalysis.timestamp).toLocaleString()}
                  </span>
                )}
              </h2>
              {analysisLoading && (
                <div className="animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200" />
                  <span className="text-xs text-purple-400">Analyzing...</span>
                </div>
              )}
            </div>

            {aiAnalysis ? (
              <>
                {/* Signal Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${
                  aiAnalysis.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' :
                  aiAnalysis.signal === 'SELL' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  <span className="text-2xl font-bold">{aiAnalysis.signal}</span>
                  <span className="text-sm">Confidence: {aiAnalysis.confidence}%</span>
                </div>

                {/* Investment Horizon */}
                <div className="mb-4">
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    aiAnalysis.investment_horizon === 'LONG_TERM' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {aiAnalysis.investment_horizon === 'LONG_TERM' ? '📈 Long Term' : '⚡ Short Term'}
                  </span>
                </div>

                {/* Highlights */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Key Highlights</h3>
                  <ul className="space-y-1">
                    {aiAnalysis.highlights?.map((highlight, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400">•</span> {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sentiment */}
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-1">Market Sentiment</h3>
                  <p className="text-sm text-slate-300">{aiAnalysis.sentiment}</p>
                </div>

                {/* Technical Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-400 mb-1">Technical</h3>
                    <p className="text-xs text-slate-300">RSI: {aiAnalysis.technical_summary?.rsi}</p>
                    <p className="text-xs text-slate-300">Trend: {aiAnalysis.technical_summary?.trend}</p>
                    <p className="text-xs text-slate-300">Support: {currency}{aiAnalysis.technical_summary?.support}</p>
                    <p className="text-xs text-slate-300">Resistance: {currency}{aiAnalysis.technical_summary?.resistance}</p>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-400 mb-1">Price Targets</h3>
                    <p className="text-xs text-rose-400">Stop Loss: {currency}{aiAnalysis.stop_loss}</p>
                    <p className="text-xs text-emerald-400">Target: {currency}{aiAnalysis.target}</p>
                  </div>
                </div>

                {/* News Summary */}
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-400 mb-1">Recent News Summary</h3>
                  <p className="text-sm text-slate-300">{aiAnalysis.recent_news_summary}</p>
                </div>
              </>
            ) : (
              <p className="text-slate-400">AI analysis loading...</p>
            )}
          </div>

          {/* News Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">📰 Related News</h2>
            {news.length > 0 ? (
              <div className="space-y-3">
                {news.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{item.source}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.sentiment === 'negative' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {item.sentiment || 'neutral'}
                          </span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No recent news found for this stock.</p>
            )}
          </div>
        </div>

        {/* Right Column - Fundamentals & Related */}
        <div className="space-y-6">
          {/* Fundamentals */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Fundamentals</h2>
            {aiAnalysis?.fundamentals_summary ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">P/E Ratio</span>
                  <span className="font-medium">{aiAnalysis.fundamentals_summary.pe_ratio || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">EPS</span>
                  <span className="font-medium">{currency}{aiAnalysis.fundamentals_summary.eps || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Book Value</span>
                  <span className="font-medium">{currency}{aiAnalysis.fundamentals_summary.book_value || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Dividend Yield</span>
                  <span className="font-medium">{aiAnalysis.fundamentals_summary.dividend_yield ? `${aiAnalysis.fundamentals_summary.dividend_yield}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">ROE</span>
                  <span className="font-medium">{aiAnalysis.fundamentals_summary.roe ? `${aiAnalysis.fundamentals_summary.roe}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Debt/Equity</span>
                  <span className="font-medium">{aiAnalysis.fundamentals_summary.debt_equity || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Fundamentals will appear after AI analysis.</p>
            )}
          </div>

          {/* Related Stocks */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">🔗 Related Stocks</h2>
            {aiAnalysis?.related_stocks && aiAnalysis.related_stocks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.related_stocks.map((stock, i) => (
                  <Link
                    key={i}
                    href={`/stock/${stock}`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    {stock}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Related stocks will appear after AI analysis.</p>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchAIAnalysis();
              fetchPrice();
            }}
            disabled={analysisLoading}
            className="w-full py-3 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg hover:bg-purple-500/30 transition-colors font-medium disabled:opacity-50"
          >
            {analysisLoading ? 'Analyzing...' : '🔄 Refresh Analysis'}
          </button>
        </div>
      </div>
    </main>
  );
}

function detectMarket(symbol: string): 'INDIA' | 'US' {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'INDIA';
  if (symbol.length <= 4 && /^[A-Z]+$/.test(symbol)) return 'US';
  if (symbol.includes('=') || symbol.endsWith('.US')) return 'US';
  return 'INDIA';
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}
