import GlassCard from '@/components/GlassCard';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export default function StatCard({ label, value, change, positive }: StatCardProps) {
  return (
    <GlassCard className="flex-1">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${positive ? 'text-w-success' : 'text-red-400'}`}>
          {positive ? '+' : ''}{change}
        </p>
      )}
    </GlassCard>
  );
}
