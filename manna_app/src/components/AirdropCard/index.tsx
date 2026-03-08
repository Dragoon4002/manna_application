'use client';

export interface AirdropData {
  id: number;
  token: string;
  amountOrb: string;
  amountDevice: string;
  totalClaimed: number;
  maxClaims: number;
  expiry: number;
  creator: string;
}

interface AirdropCardProps {
  airdrop: AirdropData;
  onClaim: (id: number) => void;
  claiming?: boolean;
  eligible?: boolean;
  reason?: string;
}

export default function AirdropCard({ airdrop, onClaim, claiming, eligible, reason }: AirdropCardProps) {
  const expiryDate = new Date(airdrop.expiry * 1000);
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
  const progress = airdrop.maxClaims > 0 ? (airdrop.totalClaimed / airdrop.maxClaims) * 100 : 0;

  return (
    <div className="rounded-xl p-4 glass-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Airdrop #{airdrop.id}</p>
          <p className="text-xs text-gray-400 font-mono truncate max-w-[180px]">{airdrop.token}</p>
        </div>
        <span className="text-xs text-gray-400">{daysLeft}d left</span>
      </div>

      <div className="flex gap-4 text-xs">
        <div>
          <p className="text-gray-400">Orb</p>
          <p className="text-white font-semibold">{airdrop.amountOrb} HDT</p>
        </div>
        <div>
          <p className="text-gray-400">Device</p>
          <p className="text-white font-semibold">{airdrop.amountDevice} HDT</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Claims</span>
          <span>{airdrop.totalClaimed}/{airdrop.maxClaims}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button
        onClick={() => onClaim(airdrop.id)}
        disabled={claiming || eligible === false}
        className="w-full py-2.5 rounded-xl bg-white font-semibold text-[#0b0e12] text-sm disabled:opacity-50"
      >
        {claiming ? 'Claiming...' : eligible === false ? (reason ?? 'Not Eligible') : 'Claim'}
      </button>
    </div>
  );
}
