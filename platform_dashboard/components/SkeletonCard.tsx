"use client";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div className={`bg-slate-900 border border-slate-800 p-6 rounded-xl ${className}`}>
      <div className="animate-pulse space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 bg-slate-700 rounded-full" />
          <div className="h-5 w-32 bg-slate-700 rounded" />
        </div>
        
        {/* Content lines */}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-4 bg-slate-700 rounded ${i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-2/3'}`} />
        ))}

        {/* Footer placeholder */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
          <div className="h-6 w-16 bg-slate-700 rounded-full" />
          <div className="h-6 w-20 bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Compact skeleton for lists
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg animate-pulse">
      <div className="h-8 w-8 bg-slate-700 rounded-full" />
      <div className="flex-1">
        <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>
      <div className="h-6 w-12 bg-slate-700 rounded" />
    </div>
  );
}

// Grid skeleton
export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}
