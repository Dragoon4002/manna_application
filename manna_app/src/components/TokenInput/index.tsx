'use client';

interface TokenInputProps {
  label: string;
  token: string;
  balance?: string;
  value: string;
  onChange: (value: string) => void;
}

export default function TokenInput({ label, token, balance, value, onChange }: TokenInputProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white bg-white/10 px-3 py-1.5 rounded-lg">
            {token}
          </span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-right text-2xl font-bold text-white outline-none w-full placeholder:text-gray-600"
        />
      </div>
      {balance && (
        <p className="text-xs text-gray-500 mt-2">
          Balance: {balance}
        </p>
      )}
    </div>
  );
}
