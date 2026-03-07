'use client';

import { useState } from 'react';
import { RefreshDouble } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';
import TokenInput from '@/components/TokenInput';

export default function TradePage() {
  const [sendValue, setSendValue] = useState('');
  const [receiveValue, setReceiveValue] = useState('');

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Trade</h1>

      <div className="relative flex flex-col gap-1">
        <GlassCard variant="glass">
          <TokenInput
            label="You send"
            token="WLD"
            balance="142.50"
            value={sendValue}
            onChange={setSendValue}
          />
        </GlassCard>

        <div className="flex justify-center -my-3 z-10">
          <button className="p-2 rounded-full bg-w-blue/20 border border-w-blue/30">
            <RefreshDouble width={18} height={18} className="text-w-blue" />
          </button>
        </div>

        <GlassCard variant="glass" shineOffset='7rem'>
          <TokenInput
            label="You get"
            token="ETH"
            balance="0.085"
            value={receiveValue}
            onChange={setReceiveValue}
          />
        </GlassCard>
      </div>

      <GlassCard className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Rate</span>
          <span className="text-white">1 WLD = 0.0008 ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Fee</span>
          <span className="text-white">~$0.02</span>
        </div>
      </GlassCard>

      <button className="w-full py-3.5 rounded-xl bg-w-blue font-semibold text-black text-sm">
        Swap
      </button>
    </div>
  );
}
