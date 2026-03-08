'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/EmptyState';

interface Balance { token: string; symbol: string; balance: string; name?: string }
interface StakingPos { id: number; amount: string; stakedAt: number; lockUntil: number; pendingRewards: string; active: boolean }
interface VestingSched { id: number; token: string; totalAmount: string; claimed: string; cliff: number; duration: number; revoked: boolean }

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [staking, setStaking] = useState<StakingPos[]>([]);
  const [vesting, setVesting] = useState<VestingSched[]>([]);
  const [loading, setLoading] = useState(true);

  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const load = useCallback(async () => {
    try {
      const [portfolioRes, tokenRes] = await Promise.all([
        fetch(`/api/portfolio?wallet=${wallet}`),
        fetch('/api/token/list'),
      ]);
      const [pData, tData] = await Promise.all([portfolioRes.json(), tokenRes.json()]);

      // merge portfolio balances with deployed tokens (avoid duplicates)
      const pBalances: Balance[] = pData.balances ?? [];
      const deployedTokens = (tData.tokens ?? []) as { address: string; name: string; symbol: string; balance: string }[];
      const seen = new Set(pBalances.map((b: Balance) => b.token.toLowerCase()));
      for (const t of deployedTokens) {
        if (!seen.has(t.address.toLowerCase())) {
          pBalances.push({ token: t.address, symbol: t.symbol, balance: t.balance, name: t.name });
          seen.add(t.address.toLowerCase());
        }
      }

      setBalances(pBalances);
      setStaking(pData.staking ?? []);
      setVesting(pData.vesting ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => { load(); }, [load]);

  const totalBalance = balances.reduce((s, b) => s + Number(b.balance), 0);
  const totalStaked = staking.filter((p) => p.active).reduce((s, p) => s + Number(p.amount), 0);
  const totalVesting = vesting.filter((v) => !v.revoked).reduce((s, v) => s + Number(v.totalAmount), 0);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Portfolio</h1>
        <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Portfolio</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Balance" value={totalBalance > 0 ? `${totalBalance.toFixed(2)}` : '0'} />
        <StatCard label="Staked" value={totalStaked > 0 ? `${totalStaked.toFixed(2)}` : '0'} />
        <StatCard label="Vesting" value={totalVesting > 0 ? `${totalVesting.toFixed(2)}` : '0'} />
      </div>

      {/* Token Balances */}
      <div>
        <SectionHeader title="Tokens" />
        {balances.length === 0 ? (
          <EmptyState text="No tokens found" />
        ) : (
          <div className="flex flex-col gap-3">
            {balances.map((b) => (
              <Link key={b.token} href={`/explore/token/${b.token}`}>
                <GlassCard className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-white">{b.symbol}</p>
                    {b.name && <p className="text-xs text-gray-400">{b.name}</p>}
                  </div>
                  <p className="text-sm font-semibold text-white">{Number(b.balance).toLocaleString()}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Staking Positions */}
      <div>
        <SectionHeader title="Staking" href="/more/staking" />
        {staking.filter((p) => p.active).length === 0 ? (
          <EmptyState text="No active stakes" />
        ) : (
          <div className="flex flex-col gap-3">
            {staking.filter((p) => p.active).map((p) => {
              const locked = Date.now() / 1000 < p.lockUntil;
              const daysLeft = Math.max(0, Math.ceil((p.lockUntil * 1000 - Date.now()) / 86400000));
              return (
                <Link key={p.id} href={`/more/staking/${p.id}`}>
                  <GlassCard className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-white">{Number(p.amount).toFixed(2)} HDT</p>
                      <p className="text-xs text-gray-400">{locked ? `${daysLeft}d locked` : 'Unlocked'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{Number(p.pendingRewards).toFixed(4)}</p>
                      <p className="text-xs text-gray-400">rewards</p>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Vesting Schedules */}
      <div>
        <SectionHeader title="Vesting" href="/more/vesting" />
        {vesting.filter((v) => !v.revoked).length === 0 ? (
          <EmptyState text="No vesting schedules" />
        ) : (
          <div className="flex flex-col gap-3">
            {vesting.filter((v) => !v.revoked).map((v) => {
              const pct = Number(v.totalAmount) > 0 ? (Number(v.claimed) / Number(v.totalAmount)) * 100 : 0;
              return (
                <Link key={v.id} href={`/more/vesting/${v.id}`}>
                  <GlassCard className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-semibold">{Number(v.totalAmount).toFixed(2)} tokens</span>
                      <span className="text-gray-400 text-xs">{pct.toFixed(0)}% claimed</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
