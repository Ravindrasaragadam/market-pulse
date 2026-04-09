"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SentimentPieChartProps {
  alerts: any[];
}

const COLORS = {
  'INDIA_MARKET': '#f97316',
  'US_MARKET': '#3b82f6',
  'DAILY_SUMMARY': '#a855f7'
};

export default function SentimentPieChart({ alerts }: SentimentPieChartProps) {
  const data = [
    { name: 'India Market', value: alerts.filter(a => a.symbol === 'INDIA_MARKET').length },
    { name: 'US Market', value: alerts.filter(a => a.symbol === 'US_MARKET').length },
    { name: 'Daily Summary', value: alerts.filter(a => a.symbol === 'DAILY_SUMMARY').length }
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No report data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
