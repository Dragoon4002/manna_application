import { Safe, Lock } from 'iconoir-react';
import NavCard from '@/components/NavCard';

const related = [
  {
    label: 'Vault',
    description: 'Secure token vaults and storage',
    href: '/vault',
    icon: Safe,
  },
  {
    label: 'Locks',
    description: 'View and manage token locks',
    href: '/locks',
    icon: Lock,
  },
];

export default function PortfolioPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Portfolio</h1>

      <div className="flex items-center justify-center h-40 mb-6 border border-dashed border-gray-700 rounded-lg">
        <p className="text-gray-500">Portfolio overview coming soon</p>
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Related
      </p>
      <div className="grid gap-3">
        {related.map((item) => (
          <NavCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
