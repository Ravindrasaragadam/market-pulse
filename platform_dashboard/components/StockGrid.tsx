"use client";

import StockCard from "./StockCard";

interface StockGridProps {
  stocks: Array<{
    symbol: string;
    price: number;
    change: number;
    changePercent?: number;
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
  }>;
}

export default function StockGrid({ stocks }: StockGridProps) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center">
        <p className="text-slate-500">No stock data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {stocks.map((stock) => (
        <StockCard
          key={stock.symbol}
          symbol={stock.symbol}
          price={stock.price}
          change={stock.change}
          changePercent={stock.changePercent}
          signal={stock.signal}
          sparklineData={stock.sparklineData}
          fundamentals={stock.fundamentals}
          growth={stock.growth}
        />
      ))}
    </div>
  );
}
