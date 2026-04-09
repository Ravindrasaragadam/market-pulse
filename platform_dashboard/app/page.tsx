"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (!error && data) setAlerts(data);
      setLoading(false);
    }
    fetchAlerts();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Antigravity Pulse
          </h1>
          <p className="text-slate-400 mt-2">Market Intelligence & Signal Hub</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-sm font-medium text-slate-500 block uppercase">Market Status</span>
            <span className="text-emerald-400 font-bold">● LIVE (NSE/BSE)</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            🚀 Recent Signals
          </h2>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-900 rounded-xl" />
              ))}
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      alert.signal_type.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : 
                      alert.signal_type.includes('SELL') ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {alert.signal_type}
                    </span>
                    <h3 className="text-xl font-bold mt-2">{alert.symbol}</h3>
                  </div>
                  <span className="text-slate-500 text-sm">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {alert.reasoning}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Mini Stats & Chart Placeholder */}
        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Sentiment Overview</h2>
            <div className="h-48 flex items-center justify-center border border-dashed border-slate-700 rounded-lg">
               <p className="text-slate-500">TradingView Widget Here</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-slate-800 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Self-Learning Engine</h2>
            <p className="text-sm text-slate-400 mb-4">
              AI performance is currently being calibrated based on your 15-30min evaluation loop.
            </p>
            <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-lg">
              <span className="text-slate-500">Prediction Accuracy</span>
              <span className="text-cyan-400 font-mono text-xl">--%</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
