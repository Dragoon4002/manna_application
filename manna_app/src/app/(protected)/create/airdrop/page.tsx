'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import FormField from '@/components/FormField';

export default function CreateAirdropPage() {
  const [tokenAddress, setTokenAddress] = useState(process.env.NEXT_PUBLIC_HDT_ADDRESS ?? '');
  const [amountOrb, setAmountOrb] = useState('100');
  const [amountDevice, setAmountDevice] = useState('50');
  const [maxClaims, setMaxClaims] = useState('1000');
  const [expiryDays, setExpiryDays] = useState('30');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: number } | null>(null);

  async function handleCreate() {
    if (!tokenAddress) return;
    setCreating(true);
    try {
      const res = await fetch('/api/airdrop/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          amountOrb,
          amountDevice,
          maxClaims: Number(maxClaims),
          expiryDays: Number(expiryDays),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreated({ id: data.airdropId });
      } else {
        alert(data.error ?? 'Failed to create airdrop');
      }
    } catch { alert('Failed to create airdrop'); }
    finally { setCreating(false); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/create" className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Airdrop</h1>
      </div>

      <GlassCard className="flex flex-col gap-4">
        <FormField label="Token Address" value={tokenAddress} onChange={setTokenAddress} placeholder="0x..." />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (Orb)" value={amountOrb} onChange={setAmountOrb} placeholder="100" inputMode="decimal" />
          <FormField label="Amount (Device)" value={amountDevice} onChange={setAmountDevice} placeholder="50" inputMode="decimal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Max Claims" value={maxClaims} onChange={setMaxClaims} placeholder="1000" inputMode="numeric" />
          <FormField label="Expiry (days)" value={expiryDays} onChange={setExpiryDays} placeholder="30" inputMode="numeric" />
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !tokenAddress}
          className="w-full py-2.5 rounded-xl bg-white text-[#0b0e12] font-semibold text-sm disabled:opacity-30 transition-opacity"
        >
          {creating ? 'Creating...' : 'Create Airdrop'}
        </button>
      </GlassCard>

      {created && (
        <GlassCard className="flex flex-col gap-2 border border-green-500/30">
          <p className="text-xs font-semibold text-green-400 uppercase">Airdrop Created</p>
          <p className="text-sm text-white font-semibold">Airdrop #{created.id}</p>
          <Link
            href={`/explore/airdrop/${created.id}`}
            className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View airdrop &rarr;
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
