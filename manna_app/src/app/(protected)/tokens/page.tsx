import { Search } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';

const tokens = [
  { symbol: 'WLD', name: 'Worldcoin', balance: '142.50', usd: '$312.75', change: '+2.4%', positive: true },
  { symbol: 'ETH', name: 'Ethereum', balance: '0.085', usd: '$221.30', change: '+1.1%', positive: true },
  { symbol: 'USDC', name: 'USD Coin', balance: '50.00', usd: '$50.00', change: '0.0%', positive: true },
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.0012', usd: '$112.50', change: '-0.3%', positive: false },
];

export default function TokensPage() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Tokens</h1>

      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
        <Search width={18} height={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search tokens..."
          className="bg-transparent text-sm text-white outline-none w-full placeholder:text-gray-600"
        />
      </div>

      <div className="grid gap-2">
        {tokens.map((token) => (
          <GlassCard key={token.symbol} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                {token.symbol.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{token.symbol}</p>
                <p className="text-xs text-gray-500">{token.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">{token.balance}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs text-gray-500">{token.usd}</span>
                <span className={`text-[10px] ${token.positive ? 'text-w-success' : 'text-red-400'}`}>
                  {token.change}
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
