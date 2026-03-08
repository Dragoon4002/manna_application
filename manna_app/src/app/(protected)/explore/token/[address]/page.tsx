'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import DetailRow from '@/components/DetailRow';
import StatCard from '@/components/StatCard';

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-xs text-gray-400 shrink-0">Contract</span>
      <button onClick={copy} className="text-sm text-white font-mono text-right break-all hover:text-indigo-400 transition-colors">
        {copied ? 'Copied!' : `${address.slice(0, 6)}...${address.slice(-4)}`}
      </button>
    </div>
  );
}

interface TokenDetail {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  userBalance?: string;
  balance?: string;
}

type TimeRange = '1H' | '1D' | '1W' | '1M';

// deterministic pseudo-random from seed
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generatePriceData(address: string, range: TimeRange): { prices: number[]; labels: string[] } {
  // seed from address bytes
  const seed = parseInt(address.slice(2, 10), 16) || 42;
  const rand = seededRandom(seed + range.charCodeAt(0));

  const counts: Record<TimeRange, number> = { '1H': 60, '1D': 24, '1W': 7, '1M': 30 };
  const n = counts[range];
  const basePrice = 0.001 + rand() * 0.05;
  const volatility: Record<TimeRange, number> = { '1H': 0.005, '1D': 0.02, '1W': 0.08, '1M': 0.15 };
  const vol = volatility[range];

  const prices: number[] = [];
  let p = basePrice;
  for (let i = 0; i < n; i++) {
    p += (rand() - 0.48) * vol * basePrice;
    if (p < basePrice * 0.3) p = basePrice * 0.3;
    prices.push(p);
  }

  const now = new Date();
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = new Date(now);
    if (range === '1H') {
      t.setMinutes(t.getMinutes() - (n - i));
      labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (range === '1D') {
      t.setHours(t.getHours() - (n - i));
      labels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (range === '1W') {
      t.setDate(t.getDate() - (n - i));
      labels.push(t.toLocaleDateString([], { weekday: 'short' }));
    } else {
      t.setDate(t.getDate() - (n - i));
      labels.push(t.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    }
  }

  return { prices, labels };
}

function PriceChart({ address }: { address: string }) {
  const [range, setRange] = useState<TimeRange>('1D');
  const { prices, labels } = useMemo(() => generatePriceData(address, range), [address, range]);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min || 1;
  const current = prices[prices.length - 1];
  const first = prices[0];
  const changeVal = current - first;
  const changePct = ((changeVal / first) * 100).toFixed(2);
  const isPositive = changeVal >= 0;

  const W = 360;
  const H = 160;
  const padY = 12;
  const usableH = H - padY * 2;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = padY + usableH - ((p - min) / spread) * usableH;
    return `${x},${y}`;
  });
  const polyline = points.join(' ');

  // gradient fill area
  const areaPath = `M0,${padY + usableH - ((prices[0] - min) / spread) * usableH} ${points.map((pt, i) => (i === 0 ? '' : `L${pt}`)).join(' ')} L${W},${H} L0,${H} Z`;

  const strokeColor = isPositive ? '#00c230' : '#ef4444';
  const gradId = `grad-${range}`;

  // hover labels: show 5 evenly spaced
  const labelIndices = [0, Math.floor(prices.length * 0.25), Math.floor(prices.length * 0.5), Math.floor(prices.length * 0.75), prices.length - 1];

  const ranges: TimeRange[] = ['1H', '1D', '1W', '1M'];

  return (
    <div className="flex flex-col gap-3">
      {/* Price header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-white">{current.toFixed(6)} ETH</p>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-500/20 text-yellow-400 uppercase">Simulated</span>
        </div>
        <p className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{changeVal.toFixed(6)} ({isPositive ? '+' : ''}{changePct}%)
        </p>
      </div>

      {/* Chart */}
      <div className="w-full overflow-hidden rounded-xl">
        <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padY + usableH * (1 - f);
            return <line key={f} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />;
          })}
          {/* fill area */}
          <path d={areaPath} fill={`url(#${gradId})`} />
          {/* line */}
          <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* dot on last point */}
          <circle cx={(prices.length - 1) / (prices.length - 1) * W} cy={padY + usableH - ((current - min) / spread) * usableH} r={3} fill={strokeColor} />
          {/* x-axis labels */}
          {labelIndices.map((idx) => {
            const x = (idx / (prices.length - 1)) * W;
            return (
              <text key={idx} x={x} y={H + 14} fill="rgba(255,255,255,0.35)" fontSize={9} textAnchor="middle">
                {labels[idx]}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Range selector */}
      <div className="flex gap-1">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              range === r ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TokenDetailPage() {
  const { address } = useParams<{ address: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/token/${address}?wallet=${wallet}`);
        const data = await res.json();
        setToken(data.token ?? data);
      } catch (err) {
        console.error('Failed to load token:', err);
      } finally {
        setLoading(false);
      }
    }
    if (address) load();
  }, [address, wallet]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <p className="text-gray-400 text-sm">Token not found</p>
        <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-white">
          Go back
        </button>
      </div>
    );
  }

  const balance = token.userBalance ?? token.balance ?? '0';
  const supply = Number(token.totalSupply);
  const bal = Number(balance);
  const holdPct = supply > 0 ? ((bal / supply) * 100).toFixed(2) : '0';

  return (
    <div className="p-6 flex flex-col gap-4 pb-24">
      <button
        onClick={() => router.back()}
        className="text-xs text-gray-500 hover:text-white transition-colors self-start"
      >
        &larr; Back
      </button>

      {/* Token identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{token.name}</h1>
          <p className="text-sm text-gray-400">{token.symbol}</p>
        </div>
      </div>

      {/* Price chart */}
      <GlassCard>
        <PriceChart address={address} />
      </GlassCard>

      {/* Stats row */}
      <div className="flex gap-2">
        <StatCard label="Your Balance" value={bal > 1000 ? `${(bal / 1000).toFixed(1)}K` : bal.toLocaleString()} />
        <StatCard label="Total Supply" value={supply > 1000 ? `${(supply / 1000).toFixed(1)}K` : supply.toLocaleString()} />
        <StatCard label="You Hold" value={`${holdPct}%`} />
      </div>

      {/* Details */}
      <GlassCard className="flex flex-col gap-1">
        <CopyableAddress address={token.address} />
        <DetailRow label="Symbol" value={token.symbol} />
        <DetailRow label="Decimals" value={String(token.decimals)} />
        <DetailRow label="Total Supply" value={Number(token.totalSupply).toLocaleString()} />
        <DetailRow label="Your Balance" value={Number(balance).toLocaleString()} />
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href="/wallet"
          className="flex-1 py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm text-center block transition-opacity hover:opacity-90"
        >
          Send
        </Link>
        <Link
          href="/create/token/mint"
          className="flex-1 py-3 rounded-xl bg-white/10 font-semibold text-white text-sm text-center block transition-opacity hover:opacity-90 border border-white/10"
        >
          Mint
        </Link>
      </div>
    </div>
  );
}
