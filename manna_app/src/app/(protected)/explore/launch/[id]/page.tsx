'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import StatCard from '@/components/StatCard';
import FormField from '@/components/FormField';

interface LaunchDetail {
  id: number;
  token: string;
  creator: string;
  totalTokens: string;
  tokensSold: string;
  hardCap: string;
  softCap: string;
  raised: string;
  currentPrice: string;
  startPrice: string;
  endPrice: string;
  maxPerWallet: string;
  startTime: number;
  endTime: number;
  status: string;
  userContribution?: string;
  userAllocation?: string;
}

interface TokenMeta {
  name: string;
  symbol: string;
}

function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <button onClick={copy} className="text-sm text-white font-mono text-right break-all hover:text-indigo-400 transition-colors">
        {copied ? 'Copied!' : `${address.slice(0, 6)}...${address.slice(-4)}`}
      </button>
    </div>
  );
}

function timeRemaining(endTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export default function LaunchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const [launch, setLaunch] = useState<LaunchDetail | null>(null);
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/launch/${id}?wallet=${wallet}`);
        const data = await res.json();
        const l = data.launch ?? data;
        setLaunch(l);

        if (l?.token) {
          try {
            const tRes = await fetch(`/api/token/${l.token}`);
            const tData = await tRes.json();
            if (tData.token) setTokenMeta({ name: tData.token.name, symbol: tData.token.symbol });
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to load launch:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id, wallet]);

  async function handleAction(action: 'contribute' | 'claim' | 'refund') {
    setSubmitting(true);
    setResult(null);
    try {
      const endpoint =
        action === 'contribute'
          ? '/api/launch/contribute'
          : action === 'claim'
          ? '/api/launch/claim'
          : '/api/launch/refund';

      const body: Record<string, unknown> = { launchId: Number(id) };
      if (action === 'contribute') body.amount = amount;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: `${action} successful! TX: ${data.txHash ?? 'confirmed'}` });
        if (action === 'contribute') setAmount('');
        // refresh
        const r2 = await fetch(`/api/launch/${id}?wallet=${wallet}`);
        const d2 = await r2.json();
        setLaunch(d2.launch ?? d2);
      } else {
        setResult({ ok: false, msg: data.error ?? `${action} failed` });
      }
    } catch (err) {
      console.error(err);
      setResult({ ok: false, msg: `${action} failed` });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <p className="text-gray-400 text-sm">Launch not found</p>
        <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-white">
          Go back
        </button>
      </div>
    );
  }

  const raisedProgress = Number(launch.hardCap) > 0 ? (Number(launch.raised) / Number(launch.hardCap)) * 100 : 0;
  const softCapProgress = Number(launch.hardCap) > 0 ? (Number(launch.softCap) / Number(launch.hardCap)) * 100 : 0;
  const tokenLabel = tokenMeta ? `${tokenMeta.name} (${tokenMeta.symbol})` : null;
  const fmtTime = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="p-6 flex flex-col gap-4 pb-24">
      <button
        onClick={() => router.back()}
        className="text-xs text-gray-500 hover:text-white transition-colors self-start"
      >
        &larr; Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
          #{launch.id}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Launch #{launch.id}</h1>
            <StatusBadge status={launch.status} />
          </div>
          {tokenLabel && <p className="text-sm text-gray-400">{tokenLabel}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <StatCard label="Raised" value={`${Number(launch.raised).toFixed(4)} ETH`} />
        <StatCard label="Price" value={`${Number(launch.currentPrice).toFixed(6)} ETH`} />
        <StatCard label="Tokens" value={Number(launch.totalTokens).toLocaleString()} />
      </div>

      {/* Progress */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Raised / Hard Cap</span>
          <span>{Number(launch.raised).toFixed(4)} / {launch.hardCap} ETH ({raisedProgress.toFixed(0)}%)</span>
        </div>
        <div className="relative">
          <ProgressBar progress={raisedProgress} />
          {/* soft cap marker */}
          {softCapProgress > 0 && softCapProgress < 100 && (
            <div
              className="absolute top-0 h-1.5 border-r border-dashed border-yellow-400"
              style={{ left: `${softCapProgress}%` }}
              title={`Soft Cap: ${launch.softCap} ETH`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Soft Cap: {launch.softCap} ETH</span>
          <span>{launch.endTime > 0 ? timeRemaining(launch.endTime) : ''}</span>
        </div>
      </GlassCard>

      {/* Details */}
      <GlassCard className="flex flex-col gap-1">
        <CopyableAddress label="Token" address={launch.token} />
        {tokenMeta && <DetailRow label="Token Name" value={`${tokenMeta.name} (${tokenMeta.symbol})`} />}
        {launch.creator && <CopyableAddress label="Creator" address={launch.creator} />}
        {launch.tokensSold && <DetailRow label="Tokens Sold" value={launch.tokensSold} />}
        {launch.startPrice && <DetailRow label="Start Price" value={`${launch.startPrice} ETH`} />}
        {launch.endPrice && <DetailRow label="End Price" value={`${launch.endPrice} ETH`} />}
        {launch.maxPerWallet && <DetailRow label="Max / Wallet" value={`${launch.maxPerWallet} ETH`} />}
        {launch.startTime > 0 && <DetailRow label="Start" value={fmtTime(launch.startTime)} />}
        {launch.endTime > 0 && <DetailRow label="End" value={fmtTime(launch.endTime)} />}
      </GlassCard>

      {/* Token link */}
      {launch.token && (
        <Link
          href={`/explore/token/${launch.token}`}
          className="w-full py-3 rounded-xl bg-white/10 font-semibold text-white text-sm text-center block transition-opacity hover:opacity-90 border border-white/10"
        >
          View Token Details
        </Link>
      )}

      {/* Active: contribute form */}
      {launch.status === 'active' && (
        <GlassCard className="flex flex-col gap-3">
          <p className="text-sm font-medium text-white">Contribute</p>
          <FormField label="Amount (ETH)" value={amount} onChange={setAmount} placeholder="0.0" inputMode="decimal" />
          <button
            onClick={() => handleAction('contribute')}
            disabled={submitting || !amount}
            className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Contributing...' : 'Contribute'}
          </button>
        </GlassCard>
      )}

      {/* Succeeded: claim */}
      {launch.status === 'succeeded' && (
        <GlassCard className="flex flex-col gap-3">
          {launch.userContribution && <DetailRow label="Your Contribution" value={`${launch.userContribution} ETH`} />}
          {launch.userAllocation && <DetailRow label="Your Allocation" value={launch.userAllocation} />}
          <button
            onClick={() => handleAction('claim')}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Claiming...' : 'Claim Tokens'}
          </button>
        </GlassCard>
      )}

      {/* Failed: refund */}
      {launch.status === 'failed' && (
        <GlassCard className="flex flex-col gap-3">
          {launch.userContribution && <DetailRow label="Your Contribution" value={`${launch.userContribution} ETH`} />}
          <button
            onClick={() => handleAction('refund')}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Refunding...' : 'Refund'}
          </button>
        </GlassCard>
      )}

      {result && (
        <div className={`text-xs p-3 rounded-lg ${result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}
