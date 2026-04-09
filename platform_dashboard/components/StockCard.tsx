"use client";

import { useState } from "react";
import Link from "next/link";
import SparklineChart from "./SparklineChart";

interface StockCardProps {
  symbol: string;
  price: number;
  change: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  sparklineData?: number[];
  fundamentals?: {
    pe?: number;
    marketCap?: string;
    volume?: string;
  };
  growth?: {
    day1?: number;
    week1?: number;
    month1?: number;
    year1?: number;
  };
}

export default function StockCard({ 
  symbol, 
  price, 
  change, 
  signal, 
  sparklineData = [],
  fundamentals = {},
  growth = {}
}: StockCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const signalColors = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    SELL: "bg-rose-500/20 text-rose-400 border-rose-500/50",
    NEUTRAL: "bg-slate-500/20 text-slate-400 border-slate-500/50"
  };

  const changeColor = change >= 0 ? "text-emerald-400" : "text-rose-400";
  const changePrefix = change >= 0 ? "+" : "";

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-cyan-500/50 transition-all duration-300 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-white">{symbol}</h3>
          <p className="text-2xl font-bold ${changeColor}">
            ${price.toFixed(2)}
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${signalColors[signal]}`}>
          {signal}
        </div>
      </div>

      {/* Change */}
      <div className={`text-sm font-semibold mb-3 ${changeColor}`}>
        {changePrefix}{change.toFixed(2)}%
      </div>

      {/* Sparkline */}
      <div className="mb-3">
        <SparklineChart data={sparklineData} height={40} />
      </div>

      {/* Hover Details */}
      {isHovered && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm rounded-xl p-4 flex flex-col justify-center border border-cyan-500/50 z-10">
          <div className="space-y-2 text-sm">
            {/* Fundamentals */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 block text-xs">P/E Ratio</span>
                <span className="text-white font-medium">{fundamentals.pe || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Market Cap</span>
                <span className="text-white font-medium">{fundamentals.marketCap || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Volume</span>
                <span className="text-white font-medium">{fundamentals.volume || "N/A"}</span>
              </div>
            </div>

            {/* Growth */}
            <div className="border-t border-slate-700 pt-2 mt-2">
              <span className="text-slate-500 block text-xs mb-1">Growth</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-slate-500">1D</div>
                  <div className={(growth.day1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {growth.day1 !== undefined ? `${(growth.day1 >= 0 ? "+" : "")}${growth.day1.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">1W</div>
                  <div className={(growth.week1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {growth.week1 !== undefined ? `${(growth.week1 >= 0 ? "+" : "")}${growth.week1.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">1M</div>
                  <div className={(growth.month1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {growth.month1 !== undefined ? `${(growth.month1 >= 0 ? "+" : "")}${growth.month1.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">1Y</div>
                  <div className={(growth.year1 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {growth.year1 !== undefined ? `${(growth.year1 >= 0 ? "+" : "")}${growth.year1.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* View Details Button */}
          <Link
            href={`/stock/${symbol}`}
            className="mt-3 w-full bg-cyan-500 hover:bg-cyan-600 text-white text-center py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View Details
          </Link>
        </div>
      )}
    </div>
  );
}
