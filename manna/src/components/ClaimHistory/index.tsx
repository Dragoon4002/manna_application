"use client";
import { useEffect, useState } from "react";

interface Claim {
  airdropId: number;
  nullifierHash: string;
  txHash: string | null;
  level: string;
  timestamp: number;
}

export const ClaimHistory = () => {
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("humandrop_claims");
    if (stored) {
      setClaims(JSON.parse(stored));
    }
  }, []);

  if (claims.length === 0) {
    return (
      <div className="w-full text-center py-8">
        <p className="text-gray-400">No claims yet</p>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">My Claims</p>
      {claims
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((claim, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-gray-200 p-4 w-full"
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-sm">
                Airdrop #{claim.airdropId}
              </p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">
                {claim.level}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(claim.timestamp).toLocaleDateString()}
            </p>
            {claim.txHash && (
              <p className="text-xs text-gray-400 font-mono mt-1 break-all">
                {claim.txHash}
              </p>
            )}
          </div>
        ))}
    </div>
  );
};
