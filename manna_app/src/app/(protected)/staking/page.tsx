'use client';

import { useState, useEffect, useCallback } from 'react';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import TokenInput from '@/components/TokenInput';

interface PositionData {
  id: number;
  amount: string;
  stakedAt: number;
  lockUntil: number;
  rewardsClaimed: string;
  pendingRewards: string;
  active: boolean;
}

const presets = ['25%', '50%', '75%', 'Max'];
const MOCK_BALANCE = 142.5;
const LOCK_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '365 days', days: 365 },
];

export default function StakingPage() {
  const [amount, setAmount] = useState('');
  const [lockDays, setLockDays] = useState(30);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      // TODO: get wallet from session
      const res = await fetch('/api/staking/positions?wallet=0x0');
      const data = await res.json();
      setPositions(data.positions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  function handlePreset(preset: string) {
    if (preset === 'Max') setAmount(MOCK_BALANCE.toString());
    else {
      const pct = parseInt(preset) / 100;
      setAmount((MOCK_BALANCE * pct).toFixed(2));
    }
  }

  async function handleStake() {
    if (!amount || Number(amount) <= 0) return;
    setStaking(true);
    try {
      const res = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, lockDays }),
      });
      const data = await res.json();
      if (data.transactions) {
        // In production: MiniKit.commandsAsync.sendTransaction for each tx
        alert(`Stake tx prepared: ${data.transactions.length} transactions`);
        fetchPositions();
      } else {
        alert(data.error ?? 'Failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStaking(false);
    }
  }

  async function handleUnstake(positionId: number) {
    const res = await fetch('/api/staking/unstake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    const data = await res.json();
    if (data.transaction) {
      alert('Unstake tx prepared');
      fetchPositions();
    }
  }

  async function handleClaimRewards(positionId: number) {
    const res = await fetch('/api/staking/claim-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    const data = await res.json();
    if (data.transaction) {
      alert('Claim rewards tx prepared');
      fetchPositions();
    }
  }

  const totalStaked = positions.filter((p) => p.active).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Staking</h1>

      <div className="flex gap-3">
        <StatCard label="Total Staked" value={`${totalStaked.toFixed(2)} HDT`} />
        <StatCard label="APY" value="12.5%" change="2.1%" positive />
      </div>

      <GlassCard variant="glass">
        <TokenInput label="Stake Amount" token="HDT" balance={MOCK_BALANCE.toString()} value={amount} onChange={setAmount} />
        <div className="flex gap-2 mt-3">
          {presets.map((p) => (
            <button key={p} onClick={() => handlePreset(p)} className="flex-1 text-xs py-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white transition-colors">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {LOCK_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setLockDays(opt.days)}
              className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${lockDays === opt.days ? 'bg-w-blue text-black font-semibold' : 'bg-white/10 text-gray-400'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={handleStake} disabled={staking} className="w-full mt-4 py-3 rounded-xl bg-w-blue font-semibold text-black text-sm disabled:opacity-50">
          {staking ? 'Staking...' : 'Stake'}
        </button>
      </GlassCard>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Positions</p>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
        ) : positions.filter((p) => p.active).length === 0 ? (
          <div className="flex items-center justify-center h-24 border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500 text-sm">No active stakes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {positions.filter((p) => p.active).map((p) => {
              const locked = Date.now() / 1000 < p.lockUntil;
              const daysLeft = Math.max(0, Math.ceil((p.lockUntil * 1000 - Date.now()) / 86400000));
              return (
                <GlassCard key={p.id} variant="glass" className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-semibold">{p.amount} HDT</span>
                    <span className="text-gray-400 text-xs">{locked ? `${daysLeft}d locked` : 'Unlocked'}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Rewards: {p.pendingRewards} HDT</span>
                    <span>Claimed: {p.rewardsClaimed} HDT</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => handleClaimRewards(p.id)} className="flex-1 py-2 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                      Claim Rewards
                    </button>
                    <button onClick={() => handleUnstake(p.id)} disabled={locked} className="flex-1 py-2 text-xs rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30">
                      Unstake
                    </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
