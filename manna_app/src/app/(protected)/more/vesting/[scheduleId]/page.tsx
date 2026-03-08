'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';

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

export default function ScheduleDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.scheduleId as string;

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/vesting/schedule/${scheduleId}`);
        const data = await res.json();
        setSchedule(data.schedule ?? data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scheduleId]);

  async function handleClaim() {
    setActing(true);
    try {
      const res = await fetch('/api/vesting/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: Number(scheduleId) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Claimed! tx: ${data.txHash?.slice(0, 18)}...`);
        router.refresh();
      } else { alert(data.error ?? 'Claim failed'); }
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  }

  async function handleRevoke() {
    setActing(true);
    try {
      const res = await fetch('/api/vesting/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: Number(scheduleId) }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Revoked! tx: ${data.txHash?.slice(0, 18)}...`);
        router.push('/more/vesting');
      } else { alert(data.error ?? 'Revoke failed'); }
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Schedule #{scheduleId}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Schedule #{scheduleId}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Schedule not found</p>
        <button onClick={() => router.push('/more/vesting')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
          Back
        </button>
      </div>
    );
  }

  const cliffReached = Date.now() / 1000 >= schedule.cliff;
  const status = schedule.revoked ? 'revoked' : cliffReached ? 'active' : 'pending';
  const progress = Number(schedule.totalAmount) > 0 ? (Number(schedule.vestedAmount) / Number(schedule.totalAmount)) * 100 : 0;
  const durationDays = Math.ceil(schedule.duration / 86400);

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedule #{schedule.id}</h1>
        <StatusBadge status={status} />
      </div>

      <GlassCard className="flex flex-col">
        <DetailRow label="Token" value={schedule.token} mono />
        <DetailRow label="Creator" value={schedule.creator} mono />
        <DetailRow label="Recipient" value={schedule.recipient} mono />
        <DetailRow label="Total Amount" value={`${schedule.totalAmount} tokens`} />
        <DetailRow label="Claimed" value={`${schedule.claimed} tokens`} />
        <DetailRow label="Vested Amount" value={`${schedule.vestedAmount} tokens`} />
        <DetailRow label="Claimable" value={`${schedule.claimable} tokens`} />
        <DetailRow label="Start" value={new Date(schedule.start * 1000).toLocaleDateString()} />
        <DetailRow label="Cliff" value={new Date(schedule.cliff * 1000).toLocaleDateString()} />
        <DetailRow label="Duration" value={`${durationDays} days`} />
        <DetailRow label="Revocable" value={schedule.revocable ? 'Yes' : 'No'} />
      </GlassCard>

      <ProgressBar progress={progress} />
      <p className="text-xs text-gray-400 text-center">{progress.toFixed(1)}% vested</p>

      <div className="flex flex-col gap-3">
        {Number(schedule.claimable) > 0 && !schedule.revoked && (
          <button onClick={handleClaim} disabled={acting} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
            {acting ? 'Claiming...' : `Claim ${schedule.claimable} tokens`}
          </button>
        )}
        {schedule.revocable && !schedule.revoked && wallet.toLowerCase() === schedule.creator.toLowerCase() && (
          <button onClick={handleRevoke} disabled={acting} className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50">
            {acting ? 'Revoking...' : 'Revoke'}
          </button>
        )}
        <button onClick={() => router.push('/more/vesting')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
          Back
        </button>
      </div>
    </div>
  );
}
