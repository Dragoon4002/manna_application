'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';

interface PayoutDetail {
  id: number;
  token: string;
  sender: string;
  totalAmount: string;
  recipientCount: number;
  timestamp: number;
}

export default function PayoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<PayoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/payouts/${id}`);
        const json = await res.json();
        setData(json.payout ?? json);
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
        <p className="text-gray-400 text-sm">Payout not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">Payout #{id}</h1>
      </div>

      <GlassCard className="flex flex-col gap-0">
        <DetailRow label="Token" value={data.token} mono />
        <DetailRow label="Sender" value={data.sender} mono />
        <DetailRow label="Total Amount" value={`${data.totalAmount} tokens`} />
        <DetailRow label="Recipients" value={data.recipientCount.toString()} />
        <DetailRow label="Date" value={new Date(data.timestamp * 1000).toLocaleDateString()} />
      </GlassCard>
    </div>
  );
}
