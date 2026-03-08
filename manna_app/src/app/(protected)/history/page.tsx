'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import GlassCard from '@/components/GlassCard';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

type FilterTab = 'all' | 'airdrop' | 'payout' | 'staking' | 'vesting';

interface HistoryItem {
  type: 'airdrop' | 'payout' | 'staking' | 'vesting';
  id: number;
  label: string;
  detail: string;
  timestamp: number;
  href: string;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('all');

  useEffect(() => {
    async function load() {
      try {
        const [airdropRes, payoutRes, stakingRes, vestingRes] = await Promise.allSettled([
          fetch('/api/airdrop/list'),
          fetch(`/api/payouts/history?wallet=${wallet}`),
          fetch(`/api/staking/positions?wallet=${wallet}`),
          fetch(`/api/vesting/schedules?wallet=${wallet}&role=recipient`),
        ]);

        const merged: HistoryItem[] = [];

        if (airdropRes.status === 'fulfilled') {
          const data = await airdropRes.value.json();
          (data.airdrops ?? []).forEach((a: { id: number; token: string; expiry: number }) => {
            merged.push({
              type: 'airdrop',
              id: a.id,
              label: `Airdrop #${a.id}`,
              detail: `${a.token.slice(0, 6)}...${a.token.slice(-4)}`,
              timestamp: a.expiry,
              href: `/history/claim/${a.id}`,
            });
          });
        }

        if (payoutRes.status === 'fulfilled') {
          const data = await payoutRes.value.json();
          (data.payouts ?? []).forEach((p: { id: number; totalAmount: string; recipientCount: number; timestamp: number }) => {
            merged.push({
              type: 'payout',
              id: p.id,
              label: `${p.totalAmount} tokens`,
              detail: `${p.recipientCount} recipients`,
              timestamp: p.timestamp,
              href: `/history/payout/${p.id}`,
            });
          });
        }

        if (stakingRes.status === 'fulfilled') {
          const data = await stakingRes.value.json();
          (data.positions ?? []).forEach((s: { id: number; amount: string; active: boolean; stakedAt: number }) => {
            merged.push({
              type: 'staking',
              id: s.id,
              label: `${s.amount} staked`,
              detail: s.active ? 'Active' : 'Ended',
              timestamp: s.stakedAt,
              href: `/more/staking/${s.id}`,
            });
          });
        }

        if (vestingRes.status === 'fulfilled') {
          const data = await vestingRes.value.json();
          (data.schedules ?? []).forEach((v: { id: number; totalAmount: string; revoked: boolean; start: number }) => {
            merged.push({
              type: 'vesting',
              id: v.id,
              label: `${v.totalAmount} vesting`,
              detail: v.revoked ? 'Revoked' : 'Active',
              timestamp: v.start,
              href: `/more/vesting/${v.id}`,
            });
          });
        }

        merged.sort((a, b) => b.timestamp - a.timestamp);
        setItems(merged);
      } catch (err) {
        console.error('History load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'airdrop', label: 'Airdrops' },
    { key: 'payout', label: 'Payouts' },
    { key: 'staking', label: 'Staking' },
    { key: 'vesting', label: 'Vesting' },
  ];

  const filtered = tab === 'all' ? items : items.filter((i) => i.type === tab);

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">History</h1>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs rounded-xl whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-white text-[#0b0e12] font-semibold' : 'bg-white/10 text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="No history yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <Link key={`${item.type}-${item.id}`} href={item.href}>
              <GlassCard className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge status={item.type} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.label}</p>
                    <p className="text-xs text-gray-400 truncate">{item.detail}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 shrink-0 ml-2">
                  {new Date(item.timestamp * 1000).toLocaleDateString()}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
