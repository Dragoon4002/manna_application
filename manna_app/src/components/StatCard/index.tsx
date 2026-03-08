interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export default function StatCard({ label, value, change, positive }: StatCardProps) {
  return (
    <div className="flex-1 rounded-2xl p-4 glass-card">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${positive ? 'text-w-success' : 'text-red-400'}`}>
          {positive ? '+' : ''}{change}
        </p>
      )}
    </div>
  );
}
