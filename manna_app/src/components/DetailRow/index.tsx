interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
}

export default function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-white text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
