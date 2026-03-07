import type { ReactNode } from 'react';

type GlassCardVariant = 'dark' | 'glass';

interface GlassCardProps {
  variant?: GlassCardVariant;
  className?: string;
  shineOffset?: string;
  children: ReactNode;
}

const variantStyles: Record<GlassCardVariant, string> = {
  dark: 'bg-gradient-to-t from-white/5 to-black/20',
  glass: 'bg-gradient-to-tr from-white/5 to-black/20 border border-white/5',
};

export default function GlassCard({ variant = 'dark', className = '', shineOffset = '2rem', children }: GlassCardProps) {
  return (
    <div className={`relative z-10 rounded-xl p-4 overflow-hidden ${variantStyles[variant]} ${className}`}>
      {children}
      {variant === 'glass' && (
        <>
          <div className='absolute -rotate-30 z-1 -top-10 bottom-0 bg-white/10 h-[150%] w-4 blur-sm' style={{ left: `calc(${shineOffset} + 6rem)` }} />
          <div className='absolute -rotate-30 z-1 -top-10 bottom-0 bg-white/30 h-[150%] w-10 blur-lg' style={{ left: shineOffset }} />
        </>
      )}
    </div>
  );
}
