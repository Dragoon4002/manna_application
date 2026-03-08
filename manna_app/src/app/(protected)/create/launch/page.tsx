'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import FormField from '@/components/FormField';

export default function CreateLaunchPage() {
  const [tokenAddress, setTokenAddress] = useState(process.env.NEXT_PUBLIC_HDT_ADDRESS ?? '');
  const [totalTokens, setTotalTokens] = useState('10000');
  const [hardCap, setHardCap] = useState('1');
  const [softCap, setSoftCap] = useState('0.1');
  const [durationHours, setDurationHours] = useState('24');
  const [maxPerWallet, setMaxPerWallet] = useState('0.5');
  const [startPrice, setStartPrice] = useState('0.0001');
  const [endPrice, setEndPrice] = useState('0.001');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: number } | null>(null);

  async function handleCreate() {
    if (!tokenAddress || !totalTokens) return;
    setCreating(true);
    try {
      const res = await fetch('/api/launch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          totalTokens,
          hardCap,
          softCap,
          durationHours: Number(durationHours),
          maxPerWallet,
          startPrice,
          endPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreated({ id: data.launchId });
      } else {
        alert(data.error ?? 'Failed to create launch');
      }
    } catch { alert('Failed to create launch'); }
    finally { setCreating(false); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/create" className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Launch</h1>
      </div>

      <GlassCard className="flex flex-col gap-4">
        <FormField label="Token Address" value={tokenAddress} onChange={setTokenAddress} placeholder="0x..." />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Total Tokens" value={totalTokens} onChange={setTotalTokens} placeholder="10000" inputMode="decimal" />
          <FormField label="Duration (hours)" value={durationHours} onChange={setDurationHours} placeholder="24" inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Hard Cap (ETH)" value={hardCap} onChange={setHardCap} placeholder="1" inputMode="decimal" />
          <FormField label="Soft Cap (ETH)" value={softCap} onChange={setSoftCap} placeholder="0.1" inputMode="decimal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Price (ETH)" value={startPrice} onChange={setStartPrice} placeholder="0.0001" inputMode="decimal" />
          <FormField label="End Price (ETH)" value={endPrice} onChange={setEndPrice} placeholder="0.001" inputMode="decimal" />
        </div>
        <FormField label="Max Per Wallet (ETH)" value={maxPerWallet} onChange={setMaxPerWallet} placeholder="0.5" inputMode="decimal" />

        <button
          onClick={handleCreate}
          disabled={creating || !tokenAddress || !totalTokens}
          className="w-full py-2.5 rounded-xl bg-white text-[#0b0e12] font-semibold text-sm disabled:opacity-30 transition-opacity"
        >
          {creating ? 'Creating...' : 'Create Launch'}
        </button>
      </GlassCard>

      {created && (
        <GlassCard className="flex flex-col gap-2 border border-green-500/30">
          <p className="text-xs font-semibold text-green-400 uppercase">Launch Created</p>
          <p className="text-sm text-white font-semibold">Launch #{created.id}</p>
          <Link
            href={`/explore/launch/${created.id}`}
            className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View launch &rarr;
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
