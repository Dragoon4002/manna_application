'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import SectionHeader from '@/components/SectionHeader';

interface PositionData {
  id: number;
  amount: string;
  stakedAt: number;
  lockUntil: number;
  rewardsClaimed: string;
  pendingRewards: string;
  active: boolean;
}

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  balance: string;
}

const presets = ['25%', '50%', '75%', 'Max'];
const LOCK_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '365 days', days: 365 },
];

export default function StakingPage() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState('');
  const [lockDays, setLockDays] = useState(30);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [selectedToken, setSelectedToken] = useState('');

  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`/api/staking/positions?wallet=${wallet}`);
      const data = await res.json();
      setPositions(data.positions ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  useEffect(() => {
    async function loadTokens() {
      try {
        const res = await fetch('/api/token/list');
        const data = await res.json();
        const list: TokenItem[] = data.tokens ?? [];
        setTokens(list);
        if (list.length > 0 && !selectedToken) setSelectedToken(list[0].address);
      } catch { /* ignore */ }
    }
    loadTokens();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentToken = tokens.find((t) => t.address === selectedToken);
  const balance = currentToken?.balance ?? '0';

  function handlePreset(preset: string) {
    const bal = Number(balance);
    if (preset === 'Max') setAmount(bal.toString());
    else {
      const pct = parseInt(preset) / 100;
      setAmount((bal * pct).toFixed(2));
    }
  }

  async function handleStake() {
    if (!amount || Number(amount) <= 0) return;
    setStaking(true);
    try {
      const body: Record<string, unknown> = { amount, lockDays };
      if (selectedToken) body.tokenAddress = selectedToken;
      const res = await fetch('/api/staking/stake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Staked! tx: ${data.txHash?.slice(0, 18)}...`);
        setAmount('');
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
    if (data.success) {
      alert(`Unstaked! tx: ${data.txHash?.slice(0, 18)}...`);
      fetchPositions();
    } else { alert(data.error ?? 'Unstake failed'); }
  }

  async function handleClaimRewards(positionId: number) {
    const res = await fetch('/api/staking/claim-rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Rewards claimed! tx: ${data.txHash?.slice(0, 18)}...`);
      fetchPositions();
    } else { alert(data.error ?? 'Claim failed'); }
  }

  const totalStaked = positions.filter((p) => p.active).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <h1 className="text-2xl font-bold text-white">Staking</h1>

      <div className="flex gap-3">
        <StatCard label="Total Staked" value={totalStaked > 0 ? totalStaked.toLocaleString() : '0'} />
        <StatCard label="APY" value="12.5%" change="2.1%" positive />
      </div>

      <GlassCard className="flex flex-col gap-3">
        {/* Token selector */}
        {tokens.length > 0 && (
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => { setSelectedToken(e.target.value); setAmount(''); }}
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-sm text-white outline-none"
            >
              {tokens.map((t) => (
                <option key={t.address} value={t.address} className="bg-[#0b0e12]">
                  {t.symbol} — {Number(t.balance).toLocaleString()} available
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Stake Amount</label>
          <div className="flex items-center px-3 py-2.5 rounded-lg bg-white/10 border border-white/10">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-500"
            />
            <span className="text-xs text-gray-400 ml-2">{currentToken?.symbol ?? 'TOKEN'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Balance: {Number(balance).toLocaleString()}</p>
        </div>

        <div className="flex gap-2">
          {presets.map((p) => (
            <button key={p} onClick={() => handlePreset(p)} className="flex-1 text-xs py-1.5 rounded-lg bg-white/10 text-gray-400 hover:text-white transition-colors">
              {p}
            </button>
          ))}
        </div>

        {/* Lock period */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Lock Period</label>
          <div className="flex gap-2">
            {LOCK_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setLockDays(opt.days)}
                className={`flex-1 text-xs py-1.5 rounded-xl transition-colors ${lockDays === opt.days ? 'bg-white text-[#0b0e12] font-semibold' : 'bg-white/10 text-gray-400'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleStake} disabled={staking || !amount} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
          {staking ? 'Staking...' : 'Stake'}
        </button>
      </GlassCard>

      <div>
        <SectionHeader title="Your Positions" count={positions.filter((p) => p.active).length} />
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
        ) : positions.filter((p) => p.active).length === 0 ? (
          <EmptyState text="No active stakes" />
        ) : (
          <div className="flex flex-col gap-3">
            {positions.filter((p) => p.active).map((p) => {
              const locked = Date.now() / 1000 < p.lockUntil;
              const daysLeft = Math.max(0, Math.ceil((p.lockUntil * 1000 - Date.now()) / 86400000));
              return (
                <Link key={p.id} href={`/more/staking/${p.id}`}>
                  <GlassCard className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-semibold">{p.amount} tokens</span>
                      <span className="text-gray-400 text-xs">{locked ? `${daysLeft}d locked` : 'Unlocked'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Rewards: {p.pendingRewards}</span>
                      <span>Claimed: {p.rewardsClaimed}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={(e) => { e.preventDefault(); handleClaimRewards(p.id); }} className="flex-1 py-2 text-xs rounded-xl bg-white text-[#0b0e12] font-semibold transition-colors">
                        Claim Rewards
                      </button>
                      <button onClick={(e) => { e.preventDefault(); handleUnstake(p.id); }} disabled={locked} className="flex-1 py-2 text-xs rounded-xl bg-white text-[#0b0e12] font-semibold transition-colors disabled:opacity-30">
                        Unstake
                      </button>
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
