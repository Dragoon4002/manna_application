import Link from 'next/link';
import type { ComponentType } from 'react';

interface NavCardProps {
  href: string;
  icon: ComponentType<{ width: number; height: number; className?: string }>;
  label: string;
  description?: string;
  isNew?: boolean;
  variant?: string;
}

export default function NavCard({
  href,
  icon: Icon,
  label,
  description,
  isNew,
}: NavCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl glass-card transition-colors hover:bg-white/10"
    >
      <Icon width={28} height={28} className="text-gray-300 mx-2" />
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
