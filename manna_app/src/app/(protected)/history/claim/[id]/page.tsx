'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';

interface AirdropDetail {
  id: number;
  token: string;
  creator: string;
  amountOrb: string;
  amountDevice: string;
  maxClaims: number;
  totalClaimed: number;
  expiry: number;
  active: boolean;
}

export default function ClaimDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<AirdropDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/airdrop/${id}`);
        const json = await res.json();
        setData(json.airdrop ?? json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Airdrop not found</p>
      </div>
    );
  }

  const progress = data.maxClaims > 0 ? (data.totalClaimed / data.maxClaims) * 100 : 0;
  const status = data.active ? 'active' : (Date.now() / 1000 > data.expiry ? 'expired' : 'ended');

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Claim #{id}</h1>
        <StatusBadge status={status} />
      </div>

      <GlassCard className="flex flex-col gap-0">
        <DetailRow label="Token" value={data.token} mono />
        <DetailRow label="Creator" value={data.creator} mono />
        <DetailRow label="Amount (Orb)" value={data.amountOrb} />
        <DetailRow label="Amount (Device)" value={data.amountDevice} />
        <DetailRow label="Claims" value={`${data.totalClaimed} / ${data.maxClaims}`} />
        <DetailRow label="Expiry" value={new Date(data.expiry * 1000).toLocaleDateString()} />
      </GlassCard>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Claims progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}
