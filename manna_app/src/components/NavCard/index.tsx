import Link from 'next/link';
import type { ComponentType } from 'react';

type NavCardVariant = 'dark' | 'glass';

interface NavCardProps {
  href: string;
  icon: ComponentType<{ width: number; height: number; className?: string }>;
  label: string;
  description?: string;
  isNew?: boolean;
  variant?: NavCardVariant;
}

const variantStyles: Record<NavCardVariant, string> = {
  dark: 'bg-gradient-to-b from-white/5 to-black/20 ',
  glass: 'bg-white/10 backdrop-blur-xl border border-white/15',
};

export default function NavCard({
  href,
  icon: Icon,
  label,
  description,
  isNew,
  variant = 'dark',
}: NavCardProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${variantStyles[variant]}`}
    >
      <Icon width={28} height={28} className="text-white mx-2" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{label}</p>
          {isNew && (
            <span className="text-[10px] font-semibold text-w-success bg-w-success/10 px-1.5 py-0.5 rounded">
              New
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </Link>
  );
}
