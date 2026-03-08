'use client';

import { BookStack, Timer, CreditCard, GraphUp, StatsReport } from 'iconoir-react';
import NavCard from '@/components/NavCard';

const items = [
  { label: 'Staking', description: 'Stake tokens and earn rewards', href: '/more/staking', icon: BookStack },
  { label: 'Vesting', description: 'Token vesting schedules', href: '/more/vesting', icon: Timer },
  { label: 'Payouts', description: 'Batch distributions', href: '/more/payouts', icon: CreditCard },
  { label: 'Portfolio', description: 'Your holdings overview', href: '/more/portfolio', icon: GraphUp },
  { label: 'Stats', description: 'Protocol analytics', href: '/more/stats', icon: StatsReport },
];

export default function MorePage() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">More</h1>
      <div className="grid gap-3">
        {items.map((item) => (
          <NavCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
