"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PriceMovementChartProps {
  alerts: any[];
}

export default function PriceMovementChart({ alerts }: PriceMovementChartProps) {
  // Count reports by type
  const reportCounts = alerts.reduce((acc, alert) => {
    const symbol = alert.symbol;
    if (!acc[symbol]) {
      acc[symbol] = 0;
    }
    acc[symbol]++;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(reportCounts)
    .map(([symbol, count]) => ({
      symbol: symbol.replace('_', ' '),
      count: count
    }))
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No report data available</p>
      </div>
    );
  }

  const COLORS = {
    'India Market': '#f97316',
    'US Market': '#3b82f6',
    'Daily Summary': '#a855f7'
  };

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          dataKey="symbol" 
          stroke="#94a3b8"
          fontSize={12}
        />
        <YAxis 
          stroke="#94a3b8"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(value: any) => `${value} reports`}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[entry.symbol as keyof typeof COLORS] || '#6b7280'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
