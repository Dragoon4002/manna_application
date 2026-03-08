'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import GlassCard from '@/components/GlassCard';
import FormField from '@/components/FormField';
import EmptyState from '@/components/EmptyState';

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  balance: string;
}

export default function WalletPage() {
  const { data: session } = useSession();
  const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedToken, setSelectedToken] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/token/list?wallet=${wallet}`);
        const data = await res.json();
        const list: TokenItem[] = data.tokens ?? [];
        setTokens(list);
        if (list.length > 0) setSelectedToken(list[0].address);
      } catch (err) {
        console.error('Failed to load tokens:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  const selected = tokens.find((t) => t.address === selectedToken);

  async function handleSend() {
    if (!selectedToken || !recipient || !amount) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/token/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: selectedToken, to: recipient, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: `Sent! TX: ${data.txHash ?? 'confirmed'}` });
        setAmount('');
        setRecipient('');
      } else {
        setResult({ ok: false, msg: data.error ?? 'Transfer failed' });
      }
    } catch (err) {
      console.error(err);
      setResult({ ok: false, msg: 'Transfer failed' });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <p className="text-gray-400 text-sm">Loading tokens...</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 pb-24">
      <h1 className="text-2xl font-bold text-white">Send Tokens</h1>

      {tokens.length === 0 ? (
        <EmptyState text="No tokens available" />
      ) : (
        <GlassCard className="flex flex-col gap-4">
          {/* Token Selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/10 text-sm text-white outline-none appearance-none"
            >
              {tokens.map((t) => (
                <option key={t.address} value={t.address} className="bg-gray-900">
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Balance display */}
          {selected && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Balance</span>
              <span className="text-white font-mono">{Number(selected.balance).toLocaleString()} {selected.symbol}</span>
            </div>
          )}

          <FormField
            label="Recipient Address"
            value={recipient}
            onChange={setRecipient}
            placeholder="0x..."
          />

          <FormField
            label="Amount"
            value={amount}
            onChange={setAmount}
            placeholder="0.0"
            inputMode="decimal"
          />

          <button
            onClick={handleSend}
            disabled={sending || !selectedToken || !recipient || !amount}
            className="w-full py-3 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50 transition-opacity"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>

          {result && (
            <div className={`text-xs p-3 rounded-lg ${result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {result.msg}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
