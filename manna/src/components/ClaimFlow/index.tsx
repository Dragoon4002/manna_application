"use client";
import { Button, LiveFeedback } from "@worldcoin/mini-apps-ui-kit-react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { useState } from "react";

const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";

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

interface ClaimFlowProps {
  airdrop: Airdrop;
  onBack: () => void;
}

type ClaimState =
  | "idle"
  | "verifying"
  | "claiming"
  | "success"
  | "already_claimed"
  | "failed";

const ACTION_ID = "humandrop-claim";

export const ClaimFlow = ({ airdrop, onBack }: ClaimFlowProps) => {
  const session = useSession();
  const [state, setState] = useState<ClaimState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimedLevel, setClaimedLevel] = useState<string | null>(null);

  const handleClaim = async (level: VerificationLevel) => {
    try {
      setState("verifying");
      setError(null);

      const receiverAddress =
        session.data?.user?.walletAddress ||
        session.data?.user?.name ||
        "0x0000000000000000000000000000000000000000";

      let proof: object;

      if (IS_DEBUG) {
        // Debug mode: skip MiniKit, use fake proof
        proof = {
          status: "success",
          merkle_root: "0xdebug0000000000000000000000000000000000000000000000000000000001",
          nullifier_hash: `0xdebug${airdrop.id.toString().padStart(4, "0")}${receiverAddress.slice(2, 38)}`,
          proof: "0xdebugproof",
          verification_level: level === VerificationLevel.Orb ? "orb" : "device",
        };
      } else {
        // Step 1: World ID verification via MiniKit
        const verifyResult = await MiniKit.commandsAsync.verify({
          action: ACTION_ID,
          verification_level: level,
        });

        if (verifyResult.finalPayload.status !== "success") {
          throw new Error("World ID verification failed");
        }

        proof = verifyResult.finalPayload;
      }

      setState("claiming");

      // Step 2: Send claim to backend -> CRE workflow
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airdropId: airdrop.id,
          proof,
          signal: receiverAddress,
          action: ACTION_ID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes("Already claimed")) {
          setState("already_claimed");
          return;
        }
        throw new Error(data.error || "Claim failed");
      }

      setTxHash(data.txHash);
      setClaimedLevel(
        level === VerificationLevel.Orb ? "Orb" : "Device",
      );
      setState("success");

      // Store claim in localStorage for history
      const claims = JSON.parse(
        localStorage.getItem("humandrop_claims") || "[]",
      );
      claims.push({
        airdropId: airdrop.id,
        nullifierHash: data.nullifierHash,
        txHash: data.txHash,
        level: level === VerificationLevel.Orb ? "orb" : "device",
        timestamp: Date.now(),
      });
      localStorage.setItem("humandrop_claims", JSON.stringify(claims));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("failed");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const feedbackState =
    state === "verifying" || state === "claiming"
      ? "pending"
      : state === "success"
        ? "success"
        : state === "failed"
          ? "failed"
          : undefined;

  const feedbackLabel =
    state === "verifying"
      ? "Verifying identity..."
      : state === "claiming"
        ? "Distributing tokens..."
        : state === "success"
          ? "Claimed!"
          : state === "failed"
            ? error || "Failed"
            : "";

  return (
    <div className="grid w-full gap-4">
      <button onClick={onBack} className="text-left text-sm text-blue-500">
        &larr; Back to airdrops
      </button>

      <div className="rounded-xl border-2 border-gray-200 p-4">
        <p className="font-semibold text-lg mb-2">Airdrop #{airdrop.id}</p>
        <p className="text-xs text-gray-400 font-mono mb-4">
          Token: {airdrop.token.slice(0, 6)}...{airdrop.token.slice(-4)}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Orb verified</p>
            <p className="font-bold text-lg">{airdrop.amountOrb}</p>
            <p className="text-xs text-gray-400">HDT</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-gray-400 text-xs mb-1">Device verified</p>
            <p className="font-bold text-lg">{airdrop.amountDevice}</p>
            <p className="text-xs text-gray-400">HDT</p>
          </div>
        </div>

        {state === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-700 font-semibold text-sm">
              Claimed {claimedLevel === "Orb" ? airdrop.amountOrb : airdrop.amountDevice} HDT ({claimedLevel})
            </p>
            {txHash && (
              <p className="text-xs text-green-600 font-mono mt-1 break-all">
                Tx: {txHash}
              </p>
            )}
          </div>
        )}

        {state === "already_claimed" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-yellow-700 font-semibold text-sm">
              Already claimed this airdrop
            </p>
          </div>
        )}

        {state !== "success" && state !== "already_claimed" && (
          <>
            <LiveFeedback
              label={{
                failed: error || "Failed",
                pending: feedbackLabel,
                success: "Claimed!",
              }}
              state={feedbackState}
              className="w-full mb-2"
            >
              <Button
                onClick={() => handleClaim(VerificationLevel.Orb)}
                disabled={state === "verifying" || state === "claiming"}
                size="lg"
                variant="primary"
                className="w-full"
              >
                Claim with Orb ({airdrop.amountOrb} HDT)
              </Button>
            </LiveFeedback>

            <LiveFeedback
              label={{
                failed: error || "Failed",
                pending: feedbackLabel,
                success: "Claimed!",
              }}
              state={feedbackState}
              className="w-full"
            >
              <Button
                onClick={() => handleClaim(VerificationLevel.Device)}
                disabled={state === "verifying" || state === "claiming"}
                size="lg"
                variant="tertiary"
                className="w-full"
              >
                Claim with Device ({airdrop.amountDevice} HDT)
              </Button>
            </LiveFeedback>
          </>
        )}
      </div>
    </div>
  );
};
