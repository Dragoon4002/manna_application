'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';

interface PositionData {
  id: number;
  amount: string;
  stakedAt: number;
  lockUntil: number;
  rewardsClaimed: string;
  pendingRewards: string;
  active: boolean;
  owner: string;
}

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const positionId = params.positionId as string;

  const [position, setPosition] = useState<PositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/staking/position/${positionId}`);
        const data = await res.json();
        setPosition(data.position ?? data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [positionId]);

  async function handleUnstake() {
    setActing(true);
    try {
      const res = await fetch('/api/staking/unstake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: Number(positionId) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Unstaked! tx: ${data.txHash?.slice(0, 18)}...`);
        router.push('/more/staking');
      } else { alert(data.error ?? 'Unstake failed'); }
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  }

  async function handleClaimRewards() {
    setActing(true);
    try {
      const res = await fetch('/api/staking/claim-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: Number(positionId) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Rewards claimed! tx: ${data.txHash?.slice(0, 18)}...`);
        router.refresh();
      } else { alert(data.error ?? 'Claim failed'); }
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Position #{positionId}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Position #{positionId}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Position not found</p>
        <button onClick={() => router.push('/more/staking')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
          Back
        </button>
      </div>
    );
  }

  const locked = Date.now() / 1000 < position.lockUntil;
  const status = !position.active ? 'ended' : locked ? 'locked' : 'unlocked';

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Position #{position.id}</h1>
        <StatusBadge status={status} />
      </div>

      <GlassCard className="flex flex-col">
        <DetailRow label="Amount" value={`${position.amount} HDT`} />
        <DetailRow label="Staked At" value={new Date(position.stakedAt * 1000).toLocaleDateString()} />
        <DetailRow label="Lock Until" value={new Date(position.lockUntil * 1000).toLocaleDateString()} />
        <DetailRow label="Rewards Claimed" value={`${position.rewardsClaimed} HDT`} />
        <DetailRow label="Pending Rewards" value={`${position.pendingRewards} HDT`} />
        {position.owner && <DetailRow label="Owner" value={position.owner} mono />}
      </GlassCard>

      <div className="flex flex-col gap-3">
        {position.active && Number(position.pendingRewards) > 0 && (
          <button onClick={handleClaimRewards} disabled={acting} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
            {acting ? 'Claiming...' : 'Claim Rewards'}
          </button>
        )}
        {position.active && !locked && (
          <button onClick={handleUnstake} disabled={acting} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
            {acting ? 'Unstaking...' : 'Unstake'}
          </button>
        )}
        <button onClick={() => router.push('/more/staking')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
          Back
        </button>
      </div>
    </div>
  );
}
