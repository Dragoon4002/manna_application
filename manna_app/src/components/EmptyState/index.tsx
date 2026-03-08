interface EmptyStateProps {
  text: string;
}

export default function EmptyState({ text }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-24 border border-dashed border-white/10 rounded-lg">
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  );
}
