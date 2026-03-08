'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import FormField from '@/components/FormField';

export default function CreateTokenPage() {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [enableMinting, setEnableMinting] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState<{ address: string; name: string; symbol: string } | null>(null);

  async function handleDeploy() {
    if (!name || !symbol || !initialSupply) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/token/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol, initialSupply, decimals: Number(decimals), enableMinting }),
      });
      const data = await res.json();
      if (data.success) {
        setDeployed({ address: data.tokenAddress, name: data.name, symbol: data.symbol });
        setName(''); setSymbol(''); setInitialSupply('');
      } else {
        alert(data.error ?? 'Deploy failed');
      }
    } catch { alert('Deploy failed'); }
    finally { setDeploying(false); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/create" className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Deploy Token</h1>
      </div>

      <GlassCard className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Name" value={name} onChange={setName} placeholder="My Token" />
          <FormField label="Symbol" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} placeholder="MTK" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Initial Supply" value={initialSupply} onChange={setInitialSupply} placeholder="1000000" inputMode="decimal" />
          <FormField label="Decimals" value={decimals} onChange={setDecimals} placeholder="18" inputMode="numeric" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEnableMinting(!enableMinting)}
            className={`w-10 h-5 rounded-full transition-colors ${enableMinting ? 'bg-indigo-500' : 'bg-white/10'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableMinting ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-gray-400">Allow future minting</span>
        </div>

        <button
          onClick={handleDeploy}
          disabled={deploying || !name || !symbol || !initialSupply}
          className="w-full py-2.5 rounded-xl bg-white text-[#0b0e12] font-semibold text-sm disabled:opacity-30 transition-opacity"
        >
          {deploying ? 'Deploying...' : 'Deploy Token'}
        </button>
      </GlassCard>

      {deployed && (
        <GlassCard className="flex flex-col gap-2 border border-green-500/30">
          <p className="text-xs font-semibold text-green-400 uppercase">Token Deployed</p>
          <p className="text-sm text-white font-semibold">{deployed.name} ({deployed.symbol})</p>
          <p className="text-xs text-gray-400 break-all font-mono">{deployed.address}</p>
          <Link
            href="/create/token/mint"
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Mint tokens for this contract &rarr;
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
