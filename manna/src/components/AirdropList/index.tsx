"use client";
import { Button } from "@worldcoin/mini-apps-ui-kit-react";
import { useEffect, useState } from "react";
import { ClaimFlow } from "@/components/ClaimFlow";

interface Airdrop {
  id: number;
  token: string;
  amountOrb: string;
  amountDevice: string;
  totalClaimed: number;
  maxClaims: number;
  expiry: number;
  creator: string;
}

export const AirdropList = () => {
  const [airdrops, setAirdrops] = useState<Airdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAirdrop, setSelectedAirdrop] = useState<Airdrop | null>(null);

  useEffect(() => {
    fetch("/api/airdrops")
      .then((res) => res.json())
      .then((data) => {
        setAirdrops(data.airdrops || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (selectedAirdrop) {
    return (
      <ClaimFlow
        airdrop={selectedAirdrop}
        onBack={() => setSelectedAirdrop(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full text-center py-8">
        <p className="text-gray-400">Loading airdrops...</p>
      </div>
    );
  }

  if (airdrops.length === 0) {
    return (
      <div className="w-full text-center py-8">
        <p className="text-gray-400">No active airdrops</p>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Active Airdrops</p>
      {airdrops.map((airdrop) => {
        const remaining = airdrop.maxClaims - airdrop.totalClaimed;
        const expiryDate = new Date(airdrop.expiry * 1000);
        const daysLeft = Math.max(
          0,
          Math.ceil(
            (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        );

        return (
          <div
            key={airdrop.id}
            className="rounded-xl border-2 border-gray-200 p-4 w-full"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-base">
                  Airdrop #{airdrop.id}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {airdrop.token.slice(0, 6)}...{airdrop.token.slice(-4)}
                </p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {daysLeft}d left
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 text-xs">Orb verified</p>
                <p className="font-semibold">{airdrop.amountOrb} HDT</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 text-xs">Device verified</p>
                <p className="font-semibold">{airdrop.amountDevice} HDT</p>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>
                  {airdrop.totalClaimed}/{airdrop.maxClaims} claimed
                </span>
                <span>{remaining} remaining</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(airdrop.totalClaimed / airdrop.maxClaims) * 100}%`,
                  }}
                />
              </div>
            </div>

            <Button
              onClick={() => setSelectedAirdrop(airdrop)}
              size="lg"
              variant="primary"
              className="w-full"
            >
              Claim
            </Button>
          </div>
        );
      })}
    </div>
  );
};
