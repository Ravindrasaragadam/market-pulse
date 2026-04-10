"use client";

import { useState, useEffect } from "react";

interface AIAnalyzerProps {
  symbol: string;
  onClose: () => void;
}

interface AnalysisResult {
  signal: string;
  confidence: number;
  reasoning: string;
  key_factors: string[];
  risk_level: string;
  time_horizon: string;
}

// Rate limiter: 5 requests per minute per user
const RATE_LIMIT_KEY = 'ai_analyzer_rate_limit';
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

// Cache settings: 1 hour TTL
const CACHE_KEY_PREFIX = 'ai_analysis_cache_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedAnalysis {
  analysis: AnalysisResult;
  timestamp: number;
  symbol: string;
}

interface RateLimitState {
  requests: number[]; // timestamps of requests
}

function getRateLimitState(): RateLimitState {
  if (typeof window === 'undefined') return { requests: [] };
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { requests: [] };
}

function saveRateLimitState(state: RateLimitState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
}

function checkRateLimit(): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const state = getRateLimitState();
  
  // Remove old requests outside the window
  state.requests = state.requests.filter(timestamp => now - timestamp < WINDOW_MS);
  
  const remaining = MAX_REQUESTS - state.requests.length;
  const resetIn = state.requests.length > 0 ? WINDOW_MS - (now - state.requests[state.requests.length - 1]) : 0;
  
  saveRateLimitState(state);
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    resetIn: Math.max(0, resetIn)
  };
}

function recordRequest() {
  const state = getRateLimitState();
  state.requests.push(Date.now());
  saveRateLimitState(state);
}

// Cache functions
function getCachedAnalysis(symbol: string): AnalysisResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${symbol}`);
    if (cached) {
      const parsed: CachedAnalysis = JSON.parse(cached);
      const now = Date.now();
      if (now - parsed.timestamp < CACHE_TTL_MS && parsed.symbol === symbol) {
        return parsed.analysis;
      }
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
}

function saveCachedAnalysis(symbol: string, analysis: AnalysisResult) {
  if (typeof window === 'undefined') return;
  try {
    const cacheData: CachedAnalysis = {
      analysis,
      timestamp: Date.now(),
      symbol
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${symbol}`, JSON.stringify(cacheData));
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

export default function AIAnalyzer({ symbol, onClose }: AIAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState({ allowed: true, remaining: 5, resetIn: 0 });
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    setRateLimitInfo(checkRateLimit());
    
    // Check for cached analysis on mount
    const cached = getCachedAnalysis(symbol);
    if (cached) {
      setResult(cached);
      setIsCached(true);
    }
  }, [symbol]);

  const handleAnalyze = async () => {
    const limit = checkRateLimit();
    setRateLimitInfo(limit);
    
    if (!limit.allowed) {
      setError(`Rate limit reached. Please wait ${Math.ceil(limit.resetIn / 1000)} seconds.`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      recordRequest();
      setRateLimitInfo(checkRateLimit());

      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setResult(data.analysis);
      setIsCached(false);
      // Save to localStorage cache
      saveCachedAnalysis(symbol, data.analysis);
    } catch (err) {
      setError('Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🤖 AI Analysis: {symbol}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Powered by NVIDIA NIM
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Rate Limit Indicator */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Requests remaining:
                <span className={rateLimitInfo.remaining <= 1 ? 'text-rose-400' : 'text-emerald-400'}>
                  {rateLimitInfo.remaining}/{MAX_REQUESTS}
                </span>
                /min
              </span>
              {isCached && (
                <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                  Cached
                </span>
              )}
            </div>
            {rateLimitInfo.resetIn > 0 && rateLimitInfo.remaining === 0 && (
              <span className="text-xs text-rose-400">
                Resets in {Math.ceil(rateLimitInfo.resetIn / 1000)}s
              </span>
            )}
          </div>

          {!result && !loading && (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-6">
                Get AI-powered analysis for {symbol} including:
              </p>
              <ul className="text-left text-sm text-slate-500 space-y-2 mb-6 max-w-md mx-auto">
                <li>• Buy/Sell/Hold signal with confidence score</li>
                <li>• Key factors affecting the stock</li>
                <li>• Risk assessment</li>
                <li>• Recommended time horizon</li>
              </ul>
              <button
                onClick={handleAnalyze}
                disabled={!rateLimitInfo.allowed}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  rateLimitInfo.allowed
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {rateLimitInfo.allowed ? '🔮 Analyze Stock' : '⏳ Rate Limited'}
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-slate-400">AI is analyzing {symbol}...</p>
              <p className="text-xs text-slate-600 mt-2">This may take 5-10 seconds</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Signal Badge */}
              <div className={`p-4 rounded-lg border ${
                result.signal === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/30' :
                result.signal === 'SELL' ? 'bg-rose-500/10 border-rose-500/30' :
                'bg-slate-500/10 border-slate-500/30'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-400">Signal</p>
                    <p className={`text-2xl font-bold ${
                      result.signal === 'BUY' ? 'text-emerald-400' :
                      result.signal === 'SELL' ? 'text-rose-400' :
                      'text-slate-400'
                    }`}>
                      {result.signal}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Confidence</p>
                    <p className="text-2xl font-bold text-white">
                      {(result.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Analysis</h3>
                <p className="text-slate-200 leading-relaxed">{result.reasoning}</p>
              </div>

              {/* Key Factors */}
              {result.key_factors && result.key_factors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Key Factors</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.key_factors.map((factor, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk & Horizon */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Risk Level</p>
                  <p className="font-medium text-slate-200">{result.risk_level}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Time Horizon</p>
                  <p className="font-medium text-slate-200">{result.time_horizon}</p>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-slate-600 border-t border-slate-800 pt-4">
                Disclaimer: This AI analysis is for informational purposes only and should not be considered as investment advice. Always do your own research before making investment decisions.
              </p>

              <button
                onClick={handleAnalyze}
                disabled={!rateLimitInfo.allowed || loading}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  rateLimitInfo.allowed && !loading
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {loading ? 'Analyzing...' : '🔮 Re-analyze'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
