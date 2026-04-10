"use client";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
  summary?: string;
}

interface LiveNewsProps {
  news: NewsItem[];
}

export default function LiveNews({ news }: LiveNewsProps) {
  if (!news || news.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
        <p className="text-slate-400">Loading latest news...</p>
      </div>
    );
  }

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'economic times':
        return 'text-orange-400';
      case 'moneycontrol':
        return 'text-emerald-400';
      case 'yahoo finance':
        return 'text-purple-400';
      default:
        return 'text-blue-400';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="max-h-96 overflow-y-auto">
        {news.map((item, index) => (
          <a
            key={index}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {item.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs font-medium ${getSourceColor(item.source)}`}>
                    {item.source}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatTime(item.published)}
                  </span>
                </div>
              </div>
              <svg
                className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
