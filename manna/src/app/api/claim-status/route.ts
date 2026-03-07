import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import HumanDropABI from "@/abi/HumanDrop.json";

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(process.env.ARBITRUM_SEPOLIA_RPC),
});

const contractAddress = process.env
  .NEXT_PUBLIC_HUMANDROP_ADDRESS as `0x${string}`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const airdropId = searchParams.get("airdropId");
  const nullifierHash = searchParams.get("nullifierHash");

  if (!airdropId || !nullifierHash) {
    return NextResponse.json(
      { error: "Missing airdropId or nullifierHash" },
      { status: 400 },
    );
  }

  try {
    const hasClaimed = await client.readContract({
      address: contractAddress,
      abi: HumanDropABI,
      functionName: "hasClaimed",
      args: [BigInt(airdropId), BigInt(nullifierHash)],
    });

    return NextResponse.json({ hasClaimed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
