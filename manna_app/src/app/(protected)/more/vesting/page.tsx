'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/EmptyState';
import ProgressBar from '@/components/ProgressBar';
import FormField from '@/components/FormField';

interface ScheduleData {
  id: number;
  token: string;
  creator: string;
  recipient: string;
  totalAmount: string;
  claimed: string;
  vestedAmount: string;
  claimable: string;
  start: number;
  cliff: number;
  duration: number;
  revocable: boolean;
  revoked: boolean;
}

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
}

export default function VestingPage() {
  const { data: session } = useSession();
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tokens, setTokens] = useState<TokenItem[]>([]);

  // create form
  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [cliffDays, setCliffDays] = useState('0');
  const [durationDays, setDurationDays] = useState('365');
  const [revocable, setRevocable] = useState(true);
  const [creating, setCreating] = useState(false);

  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const fetchSchedules = useCallback(async () => {
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`/api/vesting/schedules?wallet=${wallet}&role=recipient`),
        fetch(`/api/vesting/schedules?wallet=${wallet}&role=creator`),
      ]);
      const [rData, cData] = await Promise.all([rRes.json(), cRes.json()]);
      const all = [...(rData.schedules ?? []), ...(cData.schedules ?? [])];
      // dedupe by id
      const seen = new Set<number>();
      const deduped = all.filter((s: ScheduleData) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setSchedules(deduped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    async function loadTokens() {
      try {
        const res = await fetch('/api/token/list');
        const data = await res.json();
        const list = data.tokens ?? [];
        setTokens(list);
        if (list.length > 0 && !tokenAddress) setTokenAddress(list[0].address);
      } catch { /* ignore */ }
    }
    loadTokens();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!tokenAddress || !recipient || !amount) return;
    setCreating(true);
    try {
      const res = await fetch('/api/vesting/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          recipient,
          amount,
          cliffDays: Number(cliffDays),
          durationDays: Number(durationDays),
          revocable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Vesting created! tx: ${data.txHash?.slice(0, 18)}...`);
        setShowCreate(false);
        setRecipient('');
        setAmount('');
        fetchSchedules();
      } else {
        alert(data.error ?? 'Failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleClaim(scheduleId: number) {
    const res = await fetch('/api/vesting/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Claimed! tx: ${data.txHash?.slice(0, 18)}...`);
      fetchSchedules();
    }
  }

  async function handleRevoke(scheduleId: number) {
    const res = await fetch('/api/vesting/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Revoked! tx: ${data.txHash?.slice(0, 18)}...`);
      fetchSchedules();
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Vesting</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-2 rounded-xl bg-white text-[#0b0e12] text-xs font-semibold">
          {showCreate ? 'Cancel' : '+ Create'}
        </button>
      </div>

      {showCreate && (
        <GlassCard className="flex flex-col gap-4">
          <p className="text-sm font-medium text-white">Create Vesting Schedule</p>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
            {tokens.length > 0 ? (
              <select
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-sm text-white outline-none"
              >
                {tokens.map((t) => (
                  <option key={t.address} value={t.address} className="bg-[#0b0e12]">
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x... token address"
                className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-sm text-white outline-none placeholder:text-gray-500"
              />
            )}
          </div>

          <FormField label="Recipient Address" value={recipient} onChange={setRecipient} placeholder="0x..." />
          <FormField label="Amount (tokens)" value={amount} onChange={setAmount} placeholder="1000" inputMode="decimal" />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Cliff (days)" value={cliffDays} onChange={setCliffDays} placeholder="0" inputMode="numeric" />
            <FormField label="Duration (days)" value={durationDays} onChange={setDurationDays} placeholder="365" inputMode="numeric" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRevocable(!revocable)}
              className={`w-10 h-5 rounded-full transition-colors ${revocable ? 'bg-indigo-500' : 'bg-white/20'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${revocable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-gray-400">Revocable</span>
          </div>

          <button onClick={handleCreate} disabled={creating || !tokenAddress || !recipient || !amount} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Schedule'}
          </button>
        </GlassCard>
      )}

      <div>
        <SectionHeader title="Your Vesting Schedules" count={schedules.length} />
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
        ) : schedules.length === 0 ? (
          <EmptyState text="No vesting schedules" />
        ) : (
          <div className="flex flex-col gap-3">
            {schedules.map((s) => {
              const progress = Number(s.totalAmount) > 0 ? (Number(s.vestedAmount) / Number(s.totalAmount)) * 100 : 0;
              const cliffReached = Date.now() / 1000 >= s.cliff;
              return (
                <Link key={s.id} href={`/more/vesting/${s.id}`}>
                  <GlassCard className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-semibold">{s.totalAmount} tokens</span>
                      <span className={`text-xs ${s.revoked ? 'text-red-400' : 'text-gray-400'}`}>
                        {s.revoked ? 'Revoked' : cliffReached ? 'Active' : 'Cliff pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Vested: {s.vestedAmount}</span>
                      <span>Claimed: {s.claimed}</span>
                    </div>
                    <ProgressBar progress={progress} />
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => { e.preventDefault(); handleClaim(s.id); }} disabled={Number(s.claimable) <= 0 || s.revoked} className="flex-1 py-2 text-xs rounded-xl bg-white text-[#0b0e12] font-semibold transition-colors disabled:opacity-30">
                        Claim {Number(s.claimable) > 0 ? s.claimable : ''}
                      </button>
                      {s.revocable && !s.revoked && (
                        <button onClick={(e) => { e.preventDefault(); handleRevoke(s.id); }} className="flex-1 py-2 text-xs rounded-xl bg-white text-[#0b0e12] font-semibold transition-colors">
                          Revoke
                        </button>
                      )}
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
