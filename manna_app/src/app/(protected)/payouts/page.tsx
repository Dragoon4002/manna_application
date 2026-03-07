'use client';

import { useState, useEffect, useCallback } from 'react';
import GlassCard from '@/components/GlassCard';

interface PayoutData {
  id: number;
  token: string;
  sender: string;
  totalAmount: string;
  recipientCount: number;
  timestamp: number;
}

export default function PayoutsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(process.env.NEXT_PUBLIC_HDT_ADDRESS ?? '');
  const [recipientsText, setRecipientsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/payouts/history?wallet=0x0');
      const data = await res.json();
      setPayouts(data.payouts ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  function parseRecipients(text: string): { recipients: string[]; amounts: string[] } {
    const lines = text.trim().split('\n').filter(Boolean);
    const recipients: string[] = [];
    const amounts: string[] = [];
    for (const line of lines) {
      const [addr, amt] = line.split(',').map((s) => s.trim());
      if (addr && amt) {
        recipients.push(addr);
        amounts.push(amt);
      }
    }
    return { recipients, amounts };
  }

  async function handleCreate() {
    const { recipients, amounts } = parseRecipients(recipientsText);
    if (recipients.length === 0) { alert('Enter recipients (address,amount per line)'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/payouts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress, recipients, amounts }),
      });
      const data = await res.json();
      if (data.transactions) {
        alert(`Payout tx prepared: ${data.transactions.length} transactions`);
        setShowCreate(false);
        setRecipientsText('');
        fetchHistory();
      } else {
        alert(data.error ?? 'Failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400 text-sm">Batch token distributions</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-2 rounded-lg bg-w-blue text-black text-xs font-semibold">
          + Create
        </button>
      </div>

      {showCreate && (
        <GlassCard variant="glass" className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Token Address</label>
            <input
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Recipients (address,amount per line)</label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={5}
              placeholder={"0xABC...,100\n0xDEF...,50\n0x123...,75"}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none placeholder:text-gray-600 resize-none font-mono"
            />
          </div>
          <div className="text-xs text-gray-500">
            {parseRecipients(recipientsText).recipients.length} recipients
            {' | '}
            Total: {parseRecipients(recipientsText).amounts.reduce((s, a) => s + Number(a || 0), 0).toFixed(2)} tokens
          </div>
          <button onClick={handleCreate} disabled={creating} className="w-full py-3 rounded-xl bg-w-blue font-semibold text-black text-sm disabled:opacity-50">
            {creating ? 'Creating...' : 'Distribute'}
          </button>
        </GlassCard>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">History</p>
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
        ) : payouts.length === 0 ? (
          <div className="flex items-center justify-center h-24 border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500 text-sm">No payouts yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payouts.map((p) => (
              <GlassCard key={p.id} variant="dark" className="flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-semibold">{p.totalAmount} tokens</span>
                  <span className="text-gray-400 text-xs">{p.recipientCount} recipients</span>
                </div>
                <p className="text-xs text-gray-500 font-mono truncate">{p.token}</p>
                <p className="text-xs text-gray-500">{new Date(p.timestamp * 1000).toLocaleDateString()}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
