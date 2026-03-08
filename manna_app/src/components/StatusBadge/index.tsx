const colors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  ended: 'bg-gray-500/20 text-gray-400',
  succeeded: 'bg-blue-500/20 text-blue-400',
  failed: 'bg-red-500/20 text-red-400',
  locked: 'bg-yellow-500/20 text-yellow-400',
  unlocked: 'bg-green-500/20 text-green-400',
  revoked: 'bg-red-500/20 text-red-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  expired: 'bg-gray-500/20 text-gray-400',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cls = colors[status] ?? 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}
