"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export default function SparklineChart({ data, color = "#3b82f6", height = 60 }: SparklineChartProps) {
  // Convert array of numbers to chart data format
  const chartData = data.map((value, index) => ({
    index,
    value
  }));

  if (!data || data.length === 0) {
    return (
      <div className="h-[60px] flex items-center justify-center">
        <span className="text-slate-500 text-xs">No data</span>
      </div>
    );
  }

  const isPositive = data[data.length - 1] >= data[0];
  const lineColor = isPositive ? "#10b981" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="0" vertical={false} horizontal={false} />
        <XAxis 
          dataKey="index" 
          hide 
        />
        <YAxis 
          hide 
          domain={['auto', 'auto']}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1e293b', 
            border: '1px solid #334155', 
            borderRadius: '8px',
            fontSize: '12px'
          }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
          labelStyle={{ display: 'none' }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={lineColor} 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
