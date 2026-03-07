import { Send, Download, RefreshDouble, QrCode } from 'iconoir-react';
import GlassCard from '@/components/GlassCard';

const quickActions = [
  { label: 'Send', icon: Send },
  { label: 'Receive', icon: Download },
  { label: 'Swap', icon: RefreshDouble },
  { label: 'Scan', icon: QrCode },
];

export default function Home() {
  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Home</h1>
        <p className="text-gray-400">Welcome to Manna.</p>
      </div>

      <GlassCard variant="glass" className="text-center py-8">
        <p className="text-xs text-gray-500 mb-1">Wallet Balance</p>
        <p className="text-4xl font-bold text-white">$0.00</p>
      </GlassCard>

      <div className="grid grid-cols-4 gap-3">
        {quickActions.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-b from-white/5 to-black/20"
          >
            <Icon width={22} height={22} className="text-w-blue" />
            <span className="text-[11px] text-gray-400">{label}</span>
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Recent Activity
        </p>
        <div className="flex items-center justify-center h-32 border border-dashed border-gray-700 rounded-lg">
          <p className="text-gray-500 text-sm">No recent activity</p>
        </div>
      </div>
    </div>
  );
}
