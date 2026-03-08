interface ProgressBarProps {
  progress: number;
  className?: string;
}

export default function ProgressBar({ progress, className }: ProgressBarProps) {
  const pct = Math.min(Math.max(progress, 0), 100);
  return (
    <div className={`w-full h-1.5 bg-white/10 rounded-full overflow-hidden ${className ?? ''}`}>
      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
