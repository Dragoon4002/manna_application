'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import SearchBar from '@/components/SearchBar';
import SectionHeader from '@/components/SectionHeader';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

interface AirdropItem {
  id: number;
  token: string;
  amountOrb: string;
  amountDevice: string;
  maxClaims: number;
  totalClaimed: number;
  expiry: number;
  active: boolean;
}

interface LaunchItem {
  id: number;
  token: string;
  raised: string;
  hardCap: string;
  status: string;
  currentPrice: string;
  startTime?: number;
}

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  totalSupply: string;
}

const PREVIEW_COUNT = 3;

export default function ExplorePage() {
  const [airdrops, setAirdrops] = useState<AirdropItem[]>([]);
  const [launches, setLaunches] = useState<LaunchItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [aRes, lRes, tRes] = await Promise.all([
          fetch('/api/airdrop/list'),
          fetch('/api/launch/list'),
          fetch('/api/token/list'),
        ]);
        const [aData, lData, tData] = await Promise.all([
          aRes.json(),
          lRes.json(),
          tRes.json(),
        ]);
        setAirdrops(aData.airdrops ?? []);
        setLaunches(lData.launches ?? []);
        setTokens(tData.tokens ?? []);
      } catch (err) {
        console.error('Explore load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const q = search.toLowerCase();

  const filteredAirdrops = useMemo(() => {
    if (!q) return airdrops;
    return airdrops.filter(
      (a) =>
        `airdrop #${a.id}`.includes(q) ||
        a.token.toLowerCase().includes(q)
    );
  }, [airdrops, q]);

  const filteredLaunches = useMemo(() => {
    if (!q) return launches;
    return launches.filter(
      (l) =>
        `launch #${l.id}`.includes(q) ||
        l.token.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q)
    );
  }, [launches, q]);

  const filteredTokens = useMemo(() => {
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
  }, [tokens, q]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  const showAirdrops = filteredAirdrops.slice(0, PREVIEW_COUNT);
  const showLaunches = filteredLaunches.slice(0, PREVIEW_COUNT);
  const showTokens = filteredTokens.slice(0, PREVIEW_COUNT);
  const isEmpty = showAirdrops.length === 0 && showLaunches.length === 0 && showTokens.length === 0;

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <h1 className="text-2xl font-bold text-white">Explore</h1>

      <SearchBar value={search} onChange={setSearch} placeholder="Search airdrops, launches, tokens..." />

      {isEmpty && <EmptyState text="No items found" />}

      {/* Airdrops Section */}
      {showAirdrops.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Airdrops" count={filteredAirdrops.length} />
            {filteredAirdrops.length > PREVIEW_COUNT && (
              <Link href="/explore?tab=airdrops" className="text-xs text-purple-400 hover:text-purple-300">
                View all {filteredAirdrops.length} &rarr;
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {showAirdrops.map((a) => (
              <Link key={a.id} href={`/explore/airdrop/${a.id}`}>
                <GlassCard className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TypeBadge type="airdrop" />
                    <div>
                      <p className="text-sm font-medium text-white">Airdrop #{a.id}</p>
                      <p className="text-xs text-gray-400">{a.totalClaimed}/{a.maxClaims} claimed</p>
                    </div>
                  </div>
                  <StatusBadge status={a.active ? 'active' : 'expired'} />
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Launches Section */}
      {showLaunches.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Launches" count={filteredLaunches.length} />
            {filteredLaunches.length > PREVIEW_COUNT && (
              <Link href="/explore?tab=launches" className="text-xs text-blue-400 hover:text-blue-300">
                View all {filteredLaunches.length} &rarr;
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {showLaunches.map((l) => (
              <Link key={l.id} href={`/explore/launch/${l.id}`}>
                <GlassCard className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TypeBadge type="launch" />
                    <div>
                      <p className="text-sm font-medium text-white">Launch #{l.id}</p>
                      <p className="text-xs text-gray-400">{Number(l.raised).toFixed(4)} / {Number(l.hardCap).toFixed(4)} ETH</p>
                    </div>
                  </div>
                  <StatusBadge status={l.status} />
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tokens Section */}
      {showTokens.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Tokens" count={filteredTokens.length} />
            {filteredTokens.length > PREVIEW_COUNT && (
              <Link href="/explore?tab=tokens" className="text-xs text-green-400 hover:text-green-300">
                View all {filteredTokens.length} &rarr;
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {showTokens.map((t) => (
              <Link key={t.address} href={`/explore/token/${t.address}`}>
                <GlassCard className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TypeBadge type="token" />
                    <div>
                      <p className="text-sm font-medium text-white">{t.name || t.symbol}</p>
                      <p className="text-xs text-gray-400">{t.symbol} - {t.address.slice(0, 6)}...{t.address.slice(-4)}</p>
                    </div>
                  </div>
                  <StatusBadge status="active" />
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    airdrop: 'bg-purple-500/20 text-purple-400',
    launch: 'bg-blue-500/20 text-blue-400',
    token: 'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colors[type] ?? 'bg-gray-500/20 text-gray-400'}`}>
      {type}
    </span>
  );
}
