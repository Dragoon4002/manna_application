'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import AirdropCard, { type AirdropData } from '@/components/AirdropCard';

export default function AirdropsPage() {
  const [airdrops, setAirdrops] = useState<AirdropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Create form state
  const [tokenAddress, setTokenAddress] = useState(process.env.NEXT_PUBLIC_HDT_ADDRESS ?? '');
  const [amountOrb, setAmountOrb] = useState('100');
  const [amountDevice, setAmountDevice] = useState('50');
  const [maxClaims, setMaxClaims] = useState('1000');
  const [expiryDays, setExpiryDays] = useState('30');
  const [creating, setCreating] = useState(false);

  const fetchAirdrops = useCallback(async () => {
    try {
      const res = await fetch('/api/airdrop/list');
      const data = await res.json();
      setAirdrops(data.airdrops ?? []);
    } catch (err) {
      console.error('Failed to fetch airdrops:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAirdrops(); }, [fetchAirdrops]);

  async function handleCreate() {
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
        setShowCreate(false);
        fetchAirdrops();
      } else {
        alert(data.error ?? 'Failed to create airdrop');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create airdrop');
    } finally {
      setCreating(false);
    }
  }

  async function handleClaim(airdropId: number) {
    setClaimingId(airdropId);
    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airdropId,
          proof: { merkle_root: '0x0', nullifier_hash: '0x0', proof: '0x0', verification_level: 'device' },
          signal: '',
          action: 'claim-airdrop',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Claimed! TX: ${data.txHash}`);
        fetchAirdrops();
      } else {
        alert(data.error ?? 'Claim failed');
      }
    } catch (err) {
      console.error(err);
      alert('Claim failed');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Airdrops</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-w-blue text-black text-xs font-semibold"
        >
          <Plus width={14} height={14} />
          Create
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Active Airdrops
        </p>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        ) : airdrops.length === 0 ? (
          <div className="flex items-center justify-center h-24 border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500 text-sm">No active airdrops</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {airdrops.map((a) => (
              <AirdropCard
                key={a.id}
                airdrop={a}
                onClaim={handleClaim}
                claiming={claimingId === a.id}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Create Airdrop
          </p>
          <GlassCard variant="glass" className="flex flex-col gap-4">
            <FormField label="Token Address" value={tokenAddress} onChange={setTokenAddress} placeholder="0x..." />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Amount (Orb)" value={amountOrb} onChange={setAmountOrb} placeholder="100" />
              <FormField label="Amount (Device)" value={amountDevice} onChange={setAmountDevice} placeholder="50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Max Claims" value={maxClaims} onChange={setMaxClaims} placeholder="1000" />
              <FormField label="Expiry (days)" value={expiryDays} onChange={setExpiryDays} placeholder="30" />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3 rounded-xl bg-w-blue font-semibold text-black text-sm disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Airdrop'}
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex items-center px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-600"
        />
      </div>
    </div>
  );
}
