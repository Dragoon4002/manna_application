import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  href?: string;
  count?: number;
}

export default function SectionHeader({ title, href, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {title}{count !== undefined && ` (${count})`}
      </p>
      {href && (
        <Link href={href} className="text-xs text-gray-500 hover:text-white transition-colors">
          View all &rarr;
        </Link>
      )}
    </div>
  );
}
