'use client';

import { useState, useEffect, useCallback } from 'react';
import GlassCard from '@/components/GlassCard';

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

type Tab = 'schedules' | 'create';

export default function VestingPage() {
  const [tab, setTab] = useState<Tab>('schedules');
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [tokenAddress, setTokenAddress] = useState(process.env.NEXT_PUBLIC_HDT_ADDRESS ?? '');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [cliffDays, setCliffDays] = useState('30');
  const [durationDays, setDurationDays] = useState('365');
  const [revocable, setRevocable] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/vesting/schedules?wallet=0x0&role=recipient');
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function handleCreate() {
    if (!recipient || !amount) return;
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
      if (data.transactions) {
        alert(`Vesting tx prepared: ${data.transactions.length} transactions`);
        setTab('schedules');
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
    if (data.transaction) {
      alert('Claim tx prepared');
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
    if (data.transaction) {
      alert('Revoke tx prepared');
      fetchSchedules();
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Vesting</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('schedules')} className={`flex-1 py-2 text-sm rounded-lg transition-colors ${tab === 'schedules' ? 'bg-w-blue text-black font-semibold' : 'bg-white/10 text-gray-400'}`}>
          My Schedules
        </button>
        <button onClick={() => setTab('create')} className={`flex-1 py-2 text-sm rounded-lg transition-colors ${tab === 'create' ? 'bg-w-blue text-black font-semibold' : 'bg-white/10 text-gray-400'}`}>
          Create
        </button>
      </div>

      {tab === 'create' ? (
        <GlassCard variant="glass" className="flex flex-col gap-4">
          <Field label="Token Address" value={tokenAddress} onChange={setTokenAddress} placeholder="0x..." />
          <Field label="Recipient" value={recipient} onChange={setRecipient} placeholder="0x..." />
          <Field label="Amount" value={amount} onChange={setAmount} placeholder="1000" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliff (days)" value={cliffDays} onChange={setCliffDays} placeholder="30" />
            <Field label="Duration (days)" value={durationDays} onChange={setDurationDays} placeholder="365" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Revocable</label>
            <button onClick={() => setRevocable(!revocable)} className={`w-10 h-5 rounded-full transition-colors ${revocable ? 'bg-w-blue' : 'bg-white/20'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${revocable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button onClick={handleCreate} disabled={creating} className="w-full py-3 rounded-xl bg-w-blue font-semibold text-black text-sm disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Schedule'}
          </button>
        </GlassCard>
      ) : (
        <div>
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
          ) : schedules.length === 0 ? (
            <div className="flex items-center justify-center h-24 border border-dashed border-gray-700 rounded-lg">
              <p className="text-gray-500 text-sm">No vesting schedules</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {schedules.map((s) => {
                const progress = Number(s.totalAmount) > 0 ? (Number(s.vestedAmount) / Number(s.totalAmount)) * 100 : 0;
                const cliffReached = Date.now() / 1000 >= s.cliff;
                return (
                  <GlassCard key={s.id} variant="glass" className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-semibold">{s.totalAmount} tokens</span>
                      <span className={`text-xs ${s.revoked ? 'text-red-400' : 'text-gray-400'}`}>
                        {s.revoked ? 'Revoked' : cliffReached ? 'Active' : 'Cliff pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Vested: {s.vestedAmount}</span>
                      <span>Claimed: {s.claimed}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-w-blue rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => handleClaim(s.id)} disabled={Number(s.claimable) <= 0 || s.revoked} className="flex-1 py-2 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30">
                        Claim {Number(s.claimable) > 0 ? s.claimable : ''}
                      </button>
                      {s.revocable && !s.revoked && (
                        <button onClick={() => handleRevoke(s.id)} className="flex-1 py-2 text-xs rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                          Revoke
                        </button>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none placeholder:text-gray-600"
      />
    </div>
  );
}
