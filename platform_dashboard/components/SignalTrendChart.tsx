"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SignalTrendChartProps {
  alerts: any[];
}

export default function SignalTrendChart({ alerts }: SignalTrendChartProps) {
  // Count reports by signal_type (INDIA_REPORT, US_REPORT, COMBINED_REPORT, etc.)
  const signalCounts = alerts.reduce((acc, alert) => {
    const signalType = alert.signal_type;
    if (!acc[signalType]) {
      acc[signalType] = 0;
    }
    acc[signalType]++;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(signalCounts)
    .map(([signalType, count]) => ({
      signalType: signalType.replace('_', ' '),
      count: count
    }))
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No report type data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          type="number"
          stroke="#94a3b8"
          fontSize={12}
        />
        <YAxis 
          dataKey="signalType"
          type="category"
          stroke="#94a3b8"
          fontSize={12}
          width={100}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          itemStyle={{ color: '#e2e8f0' }}
          formatter={(value: any) => `${value} reports`}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
