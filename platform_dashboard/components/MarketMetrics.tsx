"use client";

interface MarketMetricsProps {
  alerts: any[];
}

export default function MarketMetrics({ alerts }: MarketMetricsProps) {
  const totalAlerts = alerts.length;
  const indiaReports = alerts.filter(a => a.symbol === 'INDIA_MARKET').length;
  const usReports = alerts.filter(a => a.symbol === 'US_MARKET').length;
  const dailySummaries = alerts.filter(a => a.symbol === 'DAILY_SUMMARY').length;

  const metrics = [
    {
      label: "Total Reports",
      value: totalAlerts,
      color: "text-cyan-400",
      icon: "📊"
    },
    {
      label: "India Market",
      value: indiaReports,
      color: "text-orange-400",
      icon: "🇮🇳"
    },
    {
      label: "US Market",
      value: usReports,
      color: "text-blue-400",
      icon: "🇺🇸"
    },
    {
      label: "Daily Summary",
      value: dailySummaries,
      color: "text-purple-400",
      icon: "�"
    },
    {
      label: "Report Types",
      value: new Set(alerts.map(a => a.signal_type)).size,
      color: "text-amber-400",
      icon: "📋"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors"
        >
          <div className="text-2xl mb-2">{metric.icon}</div>
          <div className={`text-2xl font-bold ${metric.color}`}>
            {metric.value}
          </div>
          <div className="text-slate-500 text-sm mt-1">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}
