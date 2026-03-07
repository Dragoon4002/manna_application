import { NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { arbitrumSepolia } from "viem/chains";
import HumanDropABI from "@/abi/HumanDrop.json";

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARBITRUM_SEPOLIA_RPC),
});

const contractAddress = process.env
  .NEXT_PUBLIC_HUMANDROP_ADDRESS as `0x${string}`;

export async function GET() {
  try {
    const nextId = (await client.readContract({
      address: contractAddress,
      abi: HumanDropABI,
      functionName: "nextAirdropId",
    })) as bigint;

    const airdrops = [];
    const count = Number(nextId);
    for (let i = 0; i < count; i++) {
      const airdrop = (await client.readContract({
        address: contractAddress,
        abi: HumanDropABI,
        functionName: "getAirdrop",
        args: [BigInt(i)],
      })) as {
        token: string;
        amountOrb: bigint;
        amountDevice: bigint;
        totalClaimed: bigint;
        maxClaims: bigint;
        expiry: bigint;
        creator: string;
        active: boolean;
      };

      // Skip expired or inactive
      if (!airdrop.active) continue;
      if (Number(airdrop.expiry) * 1000 < Date.now()) continue;

      airdrops.push({
        id: i,
        token: airdrop.token,
        amountOrb: formatUnits(airdrop.amountOrb, 18),
        amountDevice: formatUnits(airdrop.amountDevice, 18),
        totalClaimed: Number(airdrop.totalClaimed),
        maxClaims: Number(airdrop.maxClaims),
        expiry: Number(airdrop.expiry),
        creator: airdrop.creator,
      });
    }

    return NextResponse.json({ airdrops });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
