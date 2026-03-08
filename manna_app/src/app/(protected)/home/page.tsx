'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AirplaneRotation, Coins, Rocket, NavArrowRight, SendDiagonal, Plus, PlusCircle } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';

interface StatsData {
  totalAirdrops: number;
  totalLaunches: number;
  totalUsers: number;
  totalVolume: string;
}

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  totalSupply: string;
}

interface AirdropData {
  id: number;
  token: string;
  amountOrb: string;
  amountDevice: string;
  maxClaims: number;
  totalClaimed: number;
  expiry: number;
  active: boolean;
}

interface LaunchData {
  id: number;
  token: string;
  raised: string;
  hardCap: string;
  status: string;
  currentPrice: string;
}

export default function HomePage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [airdrops, setAirdrops] = useState<AirdropData[]>([]);
  const [launches, setLaunches] = useState<LaunchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tokenRes, airdropRes, launchRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/token/list'),
          fetch('/api/airdrop/list'),
          fetch('/api/launch/list'),
        ]);
        const [statsData, tokenData, airdropData, launchData] = await Promise.all([
          statsRes.json(),
          tokenRes.json(),
          airdropRes.json(),
          launchRes.json(),
        ]);
        setStats(statsData.stats ?? null);
        setTokens(tokenData.tokens ?? []);
        setAirdrops(airdropData.airdrops ?? []);
        setLaunches(launchData.launches ?? []);
      } catch (err) {
        console.error('Dashboard load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Protocol Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Airdrops" value={stats?.totalAirdrops?.toString() ?? '0'} />
        <StatCard label="Launches" value={stats?.totalLaunches?.toString() ?? '0'} />
        <StatCard label="Tokens" value={tokens.length.toString()} />
        <StatCard label="Volume" value={stats?.totalVolume && stats.totalVolume !== '0' ? `${Number(stats.totalVolume).toFixed(2)} ETH` : '---'} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/wallet"
          className="flex flex-col items-center gap-2 p-3 rounded-xl glass-card hover:bg-white/10 transition-colors"
        >
          <SendDiagonal width={20} height={20} className="text-gray-300" />
          <span className="text-xs text-white font-medium">Send</span>
        </Link>
        <Link
          href="/create/token"
          className="flex flex-col items-center gap-2 p-3 rounded-xl glass-card hover:bg-white/10 transition-colors"
        >
          <PlusCircle width={20} height={20} className="text-gray-300" />
          <span className="text-xs text-white font-medium">Create Token</span>
        </Link>
        <Link
          href="/create/airdrop"
          className="flex flex-col items-center gap-2 p-3 rounded-xl glass-card hover:bg-white/10 transition-colors"
        >
          <Plus width={20} height={20} className="text-gray-300" />
          <span className="text-xs text-white font-medium">New Airdrop</span>
        </Link>
      </div>

      {/* Tokens */}
      <Section title="Your Tokens" href="/explore" count={tokens.length}>
        {tokens.length === 0 ? (
          <EmptyState text="No tokens deployed" sub="Create one from Token Mint" />
        ) : (
          tokens.slice(0, 3).map((t) => (
            <Link key={t.address} href={`/explore/token/${t.address}`}>
              <GlassCard className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <Coins width={16} height={16} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.symbol}</p>
                    <p className="text-xs text-gray-400">{t.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{Number(t.balance).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">/ {Number(t.totalSupply).toLocaleString()}</p>
                </div>
              </GlassCard>
            </Link>
          ))
        )}
      </Section>

      {/* Active Airdrops */}
      <Section title="Active Airdrops" href="/explore" count={airdrops.length}>
        {airdrops.length === 0 ? (
          <EmptyState text="No active airdrops" sub="Create one from Airdrops page" />
        ) : (
          airdrops.slice(0, 3).map((a) => (
            <Link key={a.id} href={`/explore/airdrop/${a.id}`}>
              <GlassCard className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <AirplaneRotation width={16} height={16} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Airdrop #{a.id}</p>
                    <p className="text-xs text-gray-400">{a.totalClaimed}/{a.maxClaims} claimed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{a.amountOrb} / {a.amountDevice}</p>
                  <p className="text-xs text-gray-500">Orb / Device</p>
                </div>
              </GlassCard>
            </Link>
          ))
        )}
      </Section>

      {/* Launches */}
      <Section title="Fair Launches" href="/explore" count={launches.length}>
        {launches.length === 0 ? (
          <EmptyState text="No launches yet" sub="Create one from Fair Launch page" />
        ) : (
          launches.slice(0, 3).map((l) => {
            const progress = Number(l.hardCap) > 0 ? (Number(l.raised) / Number(l.hardCap)) * 100 : 0;
            return (
              <Link key={l.id} href={`/explore/launch/${l.id}`}>
                <GlassCard className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                        <Rocket width={16} height={16} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Launch #{l.id}</p>
                        <p className="text-xs text-gray-400">{l.status}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white">{Number(l.raised).toFixed(4)} ETH</p>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </GlassCard>
              </Link>
            );
          })
        )}
      </Section>
    </div>
  );
}

function Section({ title, href, count, children }: {
  title: string; href: string; count: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        {count > 0 && (
          <Link href={href} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
            View all <NavArrowRight width={12} height={12} />
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-20 border border-dashed border-white/10 rounded-lg gap-1">
      <p className="text-gray-400 text-sm">{text}</p>
      <p className="text-gray-500 text-xs">{sub}</p>
    </div>
  );
}
