"use client";

import { useEffect, useState } from "react";
import LoadingThinking from "./LoadingThinking";
import SkeletonCard from "./SkeletonCard";

interface MarketAnalysis {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  highlights: string[];
  top_sectors: string[];
  key_insights: string[];
  timestamp: string;
}

interface AIMarketSummaryProps {
  market: "INDIA" | "US";
}

export default function AIMarketSummary({ market }: AIMarketSummaryProps) {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [timestamp, setTimestamp] = useState<string>("");
  const [cached, setCached] = useState(false);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setGenerating(false);
      
      try {
        // Try to get cached market summary first
        const cacheResponse = await fetch(`/api/market/analyze?market=${market}`);
        
        if (cacheResponse.ok) {
          const data = await cacheResponse.json();
          setAnalysis(data.analysis);
          setTimestamp(data.timestamp || new Date().toISOString());
          setCached(data.cached);
          setLoading(false);
          return;
        }

        // If no cache, generate new analysis
        setGenerating(true);
        const response = await fetch('/api/market/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis);
          setTimestamp(data.timestamp || new Date().toISOString());
          setCached(data.cached);
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setAnalysis(null);
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    }

    fetchSummary();
  }, [market]);

  if (loading || generating) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🤖 AI Market Intelligence
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "🇮🇳 Nifty 50" : "🇺🇸 S&P 500"}
          </span>
        </h2>
        <div className="py-8">
          <LoadingThinking message="Analyzing market trends" size="md" />
          <p className="text-xs text-slate-500 mt-4 text-center">
            Generating comprehensive market analysis with AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          🤖 AI Market Intelligence
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "🇮🇳 Nifty 50" : "🇺🇸 S&P 500"}
          </span>
        </h2>
        {analysis && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            analysis.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
            analysis.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            {analysis.sentiment?.toUpperCase()} ({analysis.confidence}%)
          </span>
        )}
      </div>

      {analysis ? (
        <>
          <div className="text-slate-300 text-sm leading-relaxed mb-4">
            <p className="font-medium text-white mb-2">{analysis.summary}</p>
          </div>

          {analysis.highlights && analysis.highlights.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Key Highlights</h3>
              <ul className="space-y-1">
                {analysis.highlights.map((highlight, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.top_sectors && analysis.top_sectors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Top Sectors</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.top_sectors.map((sector, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {cached ? '📦 From cache' : '✨ Fresh analysis'} • {new Date(timestamp).toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">
              Valid for 3 hours
            </p>
          </div>
        </>
      ) : (
        <div className="text-slate-400 text-sm">
          <p>Market analysis temporarily unavailable.</p>
          <p className="mt-2">Click on any stock above to see detailed AI analysis.</p>
        </div>
      )}
    </div>
  );
}
