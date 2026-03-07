'use client';

import { useState, useEffect } from 'react';
import { AirplaneRotation, BookStack, CreditCard, Timer } from 'iconoir-react';
import NavCard from '@/components/NavCard';
import StatCard from '@/components/StatCard';

const items = [
  { label: 'Airdrops', description: 'Create and manage token airdrops', href: '/airdrops', icon: AirplaneRotation },
  { label: 'Staking', description: 'Stake tokens and earn rewards', href: '/staking', icon: BookStack },
  { label: 'Payouts', description: 'Batch token distributions', href: '/payouts', icon: CreditCard, isNew: true },
  { label: 'Vesting', description: 'Token vesting schedules', href: '/vesting', icon: Timer },
];

export default function EarnPage() {
  const [stats, setStats] = useState({ airdrops: 0, staked: '0', payouts: 0, schedules: 0 });

  useEffect(() => {
    async function load() {
      try {
        const [airdropRes] = await Promise.all([
          fetch('/api/airdrop/list'),
        ]);
        const airdropData = await airdropRes.json();
        setStats((s) => ({ ...s, airdrops: airdropData.airdrops?.length ?? 0 }));
      } catch {
        // ignore — stats are best-effort
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Earn</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Active Airdrops" value={stats.airdrops.toString()} />
        <StatCard label="Total Staked" value={stats.staked === '0' ? '—' : `${stats.staked} HDT`} />
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <NavCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
