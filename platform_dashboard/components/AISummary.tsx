"use client";

import { useEffect, useState } from "react";

interface AISummaryProps {
  market: "INDIA" | "US";
}

export default function AISummary({ market }: AISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock AI summary for now - will be replaced with real AI-generated content
    const mockSummaries = {
      INDIA: `🧠 AI Market Intelligence (Last 30 Minutes)

🔥 **Key Insight**: IT sector showing resilience despite global tech weakness. TCS and INFY ADRs moving contrary to US tech trends, indicating strong domestic demand.

📊 **Trend Alert**: Banking stocks (SBIN, HDFC, ICICI) showing unusual volume patterns - possible institutional accumulation detected.

💡 **Opportunity**: Synthetic Biology focus area gaining momentum with 3 major announcements in last hour. Consider exposure through diversified ETF approach.

⚠️ **Risk Factor**: Gold prices testing resistance at $2,350 - watch for breakout or reversal signals.

🎯 **Actionable**: Keep 30% cash for potential volatility in next 48 hours around RBI policy expectations.`,

      US: `🧠 AI Market Intelligence (Last 30 Minutes)

🔥 **Key Insight**: AI infrastructure stocks (NVDA, AMD) showing strength despite broader market weakness. Institutional positioning suggests long-term conviction.

📊 **Trend Alert**: Semiconductor supply chain improving - potential relief for manufacturing costs in Q2.

💡 **Opportunity**: Quantum computing sector seeing renewed interest after IBM breakthrough announcement.

⚠️ **Risk Factor**: Treasury yields approaching 4.5% - watch for impact on growth stock valuations.

🎯 **Actionable**: Consider defensive rotation into healthcare and consumer staples if market volatility increases.`
    };

    setTimeout(() => {
      setSummary(mockSummaries[market]);
      setLoading(false);
    }, 800);
  }, [market]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🧠 AI Market Intelligence
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🧠 AI Market Intelligence
        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
          Last 30 Minutes
        </span>
      </h2>
      <div className="prose prose-invert prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
          {summary}
        </pre>
      </div>
    </div>
  );
}
