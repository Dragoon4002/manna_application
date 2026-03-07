"use client";
import { Button, LiveFeedback } from "@worldcoin/mini-apps-ui-kit-react";
import { useState } from "react";

const HDT_ADDRESS =
  process.env.NEXT_PUBLIC_HDT_ADDRESS ||
  "0x5AC074194665D204e46fce13249B924191c70c9A";

type CreateState = "idle" | "creating" | "success" | "failed";

interface CreateResult {
  airdropId: number | null;
  createTxHash: string;
  transferTxHash: string;
  fundingAmount: string;
}

export const CreateAirdrop = () => {
  const [tokenAddress, setTokenAddress] = useState(HDT_ADDRESS);
  const [amountOrb, setAmountOrb] = useState("100");
  const [amountDevice, setAmountDevice] = useState("50");
  const [maxClaims, setMaxClaims] = useState("10");
  const [expiryDays, setExpiryDays] = useState("7");
  const [state, setState] = useState<CreateState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  const fundingPreview =
    (parseFloat(amountOrb) || 0) * (parseInt(maxClaims) || 0);

  const handleCreate = async () => {
    try {
      setState("creating");
      setError(null);

      const response = await fetch("/api/create-airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenAddress,
          amountOrb,
          amountDevice,
          maxClaims: parseInt(maxClaims),
          expiryDays: parseInt(expiryDays),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create airdrop");
      }

      setResult(data);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("failed");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError(null);
  };

  const feedbackState =
    state === "creating"
      ? "pending"
      : state === "success"
        ? "success"
        : state === "failed"
          ? "failed"
          : undefined;

  const inputClass =
    "w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none";
  const labelClass = "text-xs text-gray-500 mb-1";

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Create Airdrop</p>

      <div className="rounded-xl border-2 border-gray-200 p-4 grid gap-3">
        <div>
          <p className={labelClass}>Token Address</p>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="0x..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className={labelClass}>Amount per Orb user</p>
            <input
              type="number"
              value={amountOrb}
              onChange={(e) => setAmountOrb(e.target.value)}
              className={inputClass}
              placeholder="100"
            />
          </div>
          <div>
            <p className={labelClass}>Amount per Device user</p>
            <input
              type="number"
              value={amountDevice}
              onChange={(e) => setAmountDevice(e.target.value)}
              className={inputClass}
              placeholder="50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className={labelClass}>Max Claims</p>
            <input
              type="number"
              value={maxClaims}
              onChange={(e) => setMaxClaims(e.target.value)}
              className={inputClass}
              placeholder="10"
            />
          </div>
          <div>
            <p className={labelClass}>Expiry (days)</p>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className={inputClass}
              placeholder="7"
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-400 text-xs">Total funding (worst case)</p>
          <p className="font-bold text-lg">
            {fundingPreview.toLocaleString()} HDT
          </p>
          <p className="text-xs text-gray-400">= amountOrb × maxClaims</p>
        </div>
      </div>

      {state === "success" && result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-700 font-semibold text-sm">
            Airdrop #{result.airdropId} created & funded!
          </p>
          <p className="text-xs text-green-600 font-mono mt-1 break-all">
            Create tx: {result.createTxHash}
          </p>
          <p className="text-xs text-green-600 font-mono mt-1 break-all">
            Fund tx: {result.transferTxHash}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {result.fundingAmount} HDT transferred to contract
          </p>
          <button
            onClick={handleReset}
            className="mt-3 text-sm text-blue-500 underline"
          >
            Create another
          </button>
        </div>
      )}

      {state !== "success" && (
        <LiveFeedback
          label={{
            failed: error || "Failed",
            pending: "Creating & funding airdrop...",
            success: "Created!",
          }}
          state={feedbackState}
          className="w-full"
        >
          <Button
            onClick={handleCreate}
            disabled={state === "creating"}
            size="lg"
            variant="primary"
            className="w-full"
          >
            Create & Fund Airdrop
          </Button>
        </LiveFeedback>
      )}
    </div>
  );
};
