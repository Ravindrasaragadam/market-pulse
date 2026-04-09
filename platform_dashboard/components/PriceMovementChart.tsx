"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PriceMovementChartProps {
  alerts: any[];
}

export default function PriceMovementChart({ alerts }: PriceMovementChartProps) {
  const data = alerts.slice(0, 10).map(alert => ({
    symbol: alert.symbol,
    change: alert.metadata?.change || 0,
    signal_type: alert.signal_type
  }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No price movement data available</p>
      </div>
    );
  }

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
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(value: any) => `${typeof value === 'number' ? value.toFixed(2) : value}%`}
          labelFormatter={(label) => `Symbol: ${label}`}
        />
        <Bar dataKey="change" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.change >= 0 ? '#10b981' : '#ef4444'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
