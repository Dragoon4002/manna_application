'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { NavArrowLeft } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import FormField from '@/components/FormField';

export default function MintTokenPage() {
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const [tokenAddress, setTokenAddress] = useState('');
  const [recipient, setRecipient] = useState(wallet);
  const [amount, setAmount] = useState('');
  const [minting, setMinting] = useState(false);

  async function handleMint() {
    if (!tokenAddress || !recipient || !amount) return;
    setMinting(true);
    try {
      const res = await fetch('/api/token/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress, to: recipient, amount }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Minted! tx: ${data.txHash?.slice(0, 18)}...`);
        setAmount('');
      } else {
        alert(data.error ?? 'Mint failed');
      }
    } catch { alert('Mint failed'); }
    finally { setMinting(false); }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/create" className="text-gray-400 hover:text-white transition-colors">
          <NavArrowLeft width={20} height={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white">Mint Tokens</h1>
      </div>

      <GlassCard className="flex flex-col gap-4">
        <FormField label="Token Address" value={tokenAddress} onChange={setTokenAddress} placeholder="0x..." />
        <FormField label="Recipient" value={recipient} onChange={setRecipient} placeholder="0x..." />
        <FormField label="Amount" value={amount} onChange={setAmount} placeholder="1000" inputMode="decimal" />

        <button
          onClick={handleMint}
          disabled={minting || !tokenAddress || !recipient || !amount}
          className="w-full py-2.5 rounded-xl bg-white text-[#0b0e12] font-semibold text-sm disabled:opacity-30 transition-opacity"
        >
          {minting ? 'Minting...' : 'Mint Tokens'}
        </button>
      </GlassCard>
    </div>
  );
}
