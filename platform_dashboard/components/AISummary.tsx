"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from 'react-markdown';

interface AISummaryProps {
  market: "INDIA" | "US";
}

export default function AISummary({ market }: AISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAISummary() {
      try {
        const symbol = market === "INDIA" ? "INDIA_MARKET" : "US_MARKET";
        const { data, error } = await supabase
          .from("alerts")
          .select("reasoning")
          .eq("symbol", symbol)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data && data.reasoning) {
          setSummary(data.reasoning);
        } else {
          setSummary("No AI analysis available yet. The backend will generate market reports periodically.");
        }
      } catch (err: any) {
        console.error("Error fetching AI summary:", err);
        setSummary("Unable to fetch AI analysis. Please check backend connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchAISummary();
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
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-strong:text-white prose-ul:text-slate-300 prose-li:text-slate-300">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
