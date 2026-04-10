"use client";

import { useState, useEffect, useRef } from "react";
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
  const [displayPrice, setDisplayPrice] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Premium signal colors with amber/gold accent
  const signalColors = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    SELL: "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    NEUTRAL: "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
  };

  // Premium change colors
  const changeColor = change >= 0 ? "text-emerald-400" : "text-rose-400";
  const changePrefix = change >= 0 ? "+" : "";

  // Count-up animation for price
  useEffect(() => {
    const duration = 800;
    const startTime = Date.now();
    const startPrice = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayPrice(startPrice + (price - startPrice) * easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [price]);

  // Fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`
        bg-slate-900/80 backdrop-blur-xl 
        border border-slate-700/50 rounded-xl p-4 
        hover:border-amber-500/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]
        hover:-translate-y-1
        transition-all duration-500 ease-out
        relative group cursor-pointer
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className={`
          absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent
          translate-x-[-100%] transition-transform duration-1000
          ${isHovered ? 'translate-x-[100%]' : ''}
        `} />
      </div>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <Link href={`/stock/${symbol}`} className="block">
            <h3 className="text-xl font-bold text-white hover:text-amber-400 transition-colors duration-200">{symbol}</h3>
          </Link>
          <p className={`text-2xl font-bold ${changeColor}`}>
            ${displayPrice.toFixed(2)}
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

      {/* Sparkline with gradient fill */}
      <div className="mb-3 relative">
        <SparklineChart data={sparklineData} height={40} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none" />
      </div>

      {/* Hover Details */}
      {isHovered && (
        <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-xl rounded-xl p-4 flex flex-col justify-center border border-amber-500/30 z-10 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
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
            className="mt-3 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-center py-2 rounded-lg text-sm font-bold transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]"
          >
            View Details →
          </Link>
        </div>
      )}
    </div>
  );
}
