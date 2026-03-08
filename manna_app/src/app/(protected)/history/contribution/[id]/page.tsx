'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';

interface LaunchDetail {
  id: number;
  token: string;
  raised: string;
  hardCap: string;
  softCap: string;
  status: string;
  contribution?: string;
  allocation?: string;
}

export default function ContributionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';
  const id = params.id as string;

  const [data, setData] = useState<LaunchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/launch/${id}?wallet=${wallet}`);
        const json = await res.json();
        setData(json.launch ?? json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, wallet]);

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
        <p className="text-gray-400 text-sm">Launch not found</p>
      </div>
    );
  }

  const progress = Number(data.hardCap) > 0 ? (Number(data.raised) / Number(data.hardCap)) * 100 : 0;

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Contribution #{id}</h1>
        <StatusBadge status={data.status} />
      </div>

      <GlassCard className="flex flex-col gap-0">
        <DetailRow label="Token" value={data.token} mono />
        <DetailRow label="Raised" value={`${Number(data.raised).toFixed(4)} ETH`} />
        <DetailRow label="Hard Cap" value={`${Number(data.hardCap).toFixed(4)} ETH`} />
        <DetailRow label="Soft Cap" value={`${Number(data.softCap).toFixed(4)} ETH`} />
        {data.contribution && <DetailRow label="Your Contribution" value={`${data.contribution} ETH`} />}
        {data.allocation && <DetailRow label="Your Allocation" value={`${data.allocation} tokens`} />}
        <DetailRow label="Status" value={data.status} />
      </GlassCard>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Raised / Hard Cap</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}
