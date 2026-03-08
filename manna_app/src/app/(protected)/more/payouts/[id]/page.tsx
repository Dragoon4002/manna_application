'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';

interface PayoutData {
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

  const [payout, setPayout] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/payouts/${id}`);
        const data = await res.json();
        setPayout(data.payout ?? data);
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
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Payout #{id}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Loading...</p>
      </div>
    );
  }

  if (!payout) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Payout #{id}</h1>
        <p className="text-gray-400 text-sm text-center py-12">Payout not found</p>
        <button onClick={() => router.push('/more/payouts')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Payout #{payout.id}</h1>

      <GlassCard className="flex flex-col">
        <DetailRow label="Token" value={payout.token} mono />
        <DetailRow label="Sender" value={payout.sender} mono />
        <DetailRow label="Total Amount" value={`${payout.totalAmount} tokens`} />
        <DetailRow label="Recipient Count" value={String(payout.recipientCount)} />
        <DetailRow label="Date" value={new Date(payout.timestamp * 1000).toLocaleDateString()} />
      </GlassCard>

      <button onClick={() => router.push('/more/payouts')} className="w-full py-3 rounded-xl bg-white text-[#0b0e12] text-sm font-semibold">
        Back
      </button>
    </div>
  );
}
