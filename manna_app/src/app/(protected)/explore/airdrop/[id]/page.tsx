'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import StatCard from '@/components/StatCard';

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

function timeRemaining(expiry: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiry - now;
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

export default function AirdropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [airdrop, setAirdrop] = useState<AirdropDetail | null>(null);
  const [tokenMeta, setTokenMeta] = useState<TokenMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/airdrop/${id}`);
        const data = await res.json();
        const a = data.airdrop ?? data;
        setAirdrop(a);

        // resolve token name
        if (a?.token) {
          try {
            const tRes = await fetch(`/api/token/${a.token}`);
            const tData = await tRes.json();
            if (tData.token) setTokenMeta({ name: tData.token.name, symbol: tData.token.symbol });
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Failed to load airdrop:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function handleClaim() {
    setClaiming(true);
    setResult(null);
    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airdropId: Number(id),
          proof: {
            merkle_root: '0x0',
            nullifier_hash: '0x0',
            proof: '0x0',
            verification_level: 'device',
          },
          signal: '',
          action: 'claim-airdrop',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const debugNote = data.debug ? ' (debug mode — no on-chain tx)' : '';
        setResult({ ok: true, msg: `Claimed!${debugNote} TX: ${data.txHash ?? 'confirmed'}` });
        // refresh data (won't change in debug mode since no real tx)
        const r2 = await fetch(`/api/airdrop/${id}`);
        const d2 = await r2.json();
        setAirdrop(d2.airdrop ?? d2);
      } else {
        setResult({ ok: false, msg: data.error ?? 'Claim failed' });
      }
    } catch (err) {
      console.error(err);
      setResult({ ok: false, msg: 'Claim failed' });
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!airdrop) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <p className="text-gray-400 text-sm">Airdrop not found</p>
        <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-white">
          Go back
        </button>
      </div>
    );
  }

  const status = airdrop.active ? 'active' : 'expired';
  const claimProgress = airdrop.maxClaims > 0 ? (airdrop.totalClaimed / airdrop.maxClaims) * 100 : 0;
  const remaining = airdrop.maxClaims - airdrop.totalClaimed;
  const expiryDate = new Date(airdrop.expiry * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
          {tokenMeta ? tokenMeta.symbol.slice(0, 2) : '??'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{tokenMeta?.name ?? `Token ${airdrop.token.slice(0, 6)}...`}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-gray-400">{tokenMeta ? `${tokenMeta.symbol} Airdrop` : `Airdrop #${airdrop.id}`}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <StatCard label="Orb Reward" value={`${Number(airdrop.amountOrb).toLocaleString()}`} />
        <StatCard label="Device Reward" value={`${Number(airdrop.amountDevice).toLocaleString()}`} />
        <StatCard label="Remaining" value={`${remaining}`} />
      </div>

      {/* Progress */}
      <GlassCard className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Claims</span>
          <span>{airdrop.totalClaimed} / {airdrop.maxClaims} ({claimProgress.toFixed(0)}%)</span>
        </div>
        <ProgressBar progress={claimProgress} />
        <p className="text-xs text-gray-500 mt-1">{timeRemaining(airdrop.expiry)}</p>
      </GlassCard>

      {/* Details */}
      <GlassCard className="flex flex-col gap-1">
        <CopyableAddress label="Token" address={airdrop.token} />
        {airdrop.creator && <CopyableAddress label="Creator" address={airdrop.creator} />}
        <DetailRow label="Expiry" value={expiryDate} />
      </GlassCard>

      {/* Token link */}
      {airdrop.token && (
        <Link
          href={`/explore/token/${airdrop.token}`}
          className="w-full py-3 rounded-xl bg-white/10 font-semibold text-white text-sm text-center block transition-opacity hover:opacity-90 border border-white/10"
        >
          View Token Details
        </Link>
      )}

      {/* Claim */}
      {airdrop.active && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50 transition-opacity"
        >
          {claiming ? 'Claiming...' : 'Claim Airdrop'}
        </button>
      )}

      {result && (
        <div className={`text-xs p-3 rounded-lg ${result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {result.msg}
        </div>
      )}
    </div>
  );
}
