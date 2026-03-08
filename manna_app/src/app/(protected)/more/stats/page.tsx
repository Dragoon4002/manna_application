'use client';

import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import StatCard from '@/components/StatCard';
import SectionHeader from '@/components/SectionHeader';

interface ChainStats {
  chainName: string;
  airdrops: number;
  launches: number;
  users: number;
  volume: string;
}

interface StatsData {
  totalAirdrops: number;
  totalLaunches: number;
  totalUsers: number;
  totalVolume: string;
  chainStats: ChainStats[];
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Protocol Stats</h1>
        <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Protocol Stats</h1>
        <p className="text-gray-400 text-sm text-center py-12">Failed to load stats</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Protocol Stats</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Airdrops" value={String(stats.totalAirdrops)} />
        <StatCard label="Total Launches" value={String(stats.totalLaunches)} />
        <StatCard label="Total Users" value={String(stats.totalUsers)} />
        <StatCard label="Total Volume" value={stats.totalVolume} />
      </div>

      {stats.chainStats && stats.chainStats.length > 0 && (
        <div>
          <SectionHeader title="Chain Stats" count={stats.chainStats.length} />
          <div className="flex flex-col gap-4">
            {stats.chainStats.map((chain) => (
              <GlassCard key={chain.chainName} className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-white">{chain.chainName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Airdrops" value={String(chain.airdrops)} />
                  <StatCard label="Launches" value={String(chain.launches)} />
                  <StatCard label="Users" value={String(chain.users)} />
                  <StatCard label="Volume" value={chain.volume} />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
