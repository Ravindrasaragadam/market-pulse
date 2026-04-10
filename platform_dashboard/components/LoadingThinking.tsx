"use client";

interface LoadingThinkingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingThinking({ 
  message = "Thinking", 
  size = "md" 
}: LoadingThinkingProps) {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className="flex items-center gap-2 text-slate-400">
      <span className={textSizes[size]}>{message}</span>
      <div className="flex gap-1">
        <div className={`${dotSizes[size]} bg-cyan-500 rounded-full animate-bounce`} style={{ animationDelay: "0ms" }} />
        <div className={`${dotSizes[size]} bg-cyan-500 rounded-full animate-bounce`} style={{ animationDelay: "150ms" }} />
        <div className={`${dotSizes[size]} bg-cyan-500 rounded-full animate-bounce`} style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
