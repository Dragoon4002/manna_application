import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import HumanDropABI from "@/abi/HumanDrop.json";
import ERC20ABI from "@/abi/ERC20.json";

const rpc = process.env.ARBITRUM_SEPOLIA_RPC!;
const contractAddress = process.env
  .NEXT_PUBLIC_HUMANDROP_ADDRESS as `0x${string}`;

interface CreateAirdropBody {
  tokenAddress: string;
  amountOrb: string;
  amountDevice: string;
  maxClaims: number;
  expiryDays: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateAirdropBody;

    if (
      !body.tokenAddress ||
      !body.amountOrb ||
      !body.amountDevice ||
      !body.maxClaims ||
      !body.expiryDays
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const privateKey = process.env.CREATOR_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Creator key not configured" },
        { status: 500 },
      );
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(rpc),
    });

    const walletClient = createWalletClient({
      account,
      chain: arbitrumSepolia,
      transport: http(rpc),
    });

    const amountOrbWei = parseUnits(body.amountOrb, 18);
    const amountDeviceWei = parseUnits(body.amountDevice, 18);
    const expiry = BigInt(
      Math.floor(Date.now() / 1000) + body.expiryDays * 86400,
    );

    // Step 1: createAirdrop
    const createHash = await walletClient.writeContract({
      address: contractAddress,
      abi: HumanDropABI,
      functionName: "createAirdrop",
      args: [
        body.tokenAddress as `0x${string}`,
        amountOrbWei,
        amountDeviceWei,
        BigInt(body.maxClaims),
        expiry,
      ],
    });

    const createReceipt = await publicClient.waitForTransactionReceipt({
      hash: createHash,
    });

    // Parse airdropId from AirdropCreated event
    let airdropId: number | null = null;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: HumanDropABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "AirdropCreated") {
          const args = decoded.args as unknown as { airdropId: bigint };
          airdropId = Number(args.airdropId);
          break;
        }
      } catch {
        // not our event, skip
      }
    }

    // Step 2: Transfer tokens to contract (worst-case: amountOrb * maxClaims)
    const fundingAmount = amountOrbWei * BigInt(body.maxClaims);

    const transferHash = await walletClient.writeContract({
      address: body.tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: "transfer",
      args: [contractAddress, fundingAmount],
    });

    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    return NextResponse.json({
      success: true,
      airdropId,
      createTxHash: createHash,
      transferTxHash: transferHash,
      fundingAmount: formatUnits(fundingAmount, 18),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
