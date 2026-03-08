import type { ReactNode } from 'react';

interface GlassCardProps {
  variant?: string;
  className?: string;
  shineOffset?: string;
  children: ReactNode;
}

export default function GlassCard({ className = '', children }: GlassCardProps) {
  return (
    <div className={`rounded-2xl p-4 glass-card ${className}`}>
      {children}
    </div>
  );
}
