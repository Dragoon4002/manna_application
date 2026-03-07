import { NextRequest, NextResponse } from 'next/server';
import { parseUnits, formatUnits, decodeEventLog } from 'viem';
import { publicClient, getWalletClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';
import ERC20ABI from '@/abi/ERC20.json';

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

    if (!body.tokenAddress || !body.amountOrb || !body.amountDevice || !body.maxClaims || !body.expiryDays) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const walletClient = getWalletClient();
    const amountOrbWei = parseUnits(body.amountOrb, 18);
    const amountDeviceWei = parseUnits(body.amountDevice, 18);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + body.expiryDays * 86400);

    const createHash = await walletClient.writeContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'createAirdrop',
      args: [body.tokenAddress as `0x${string}`, amountOrbWei, amountDeviceWei, BigInt(body.maxClaims), expiry],
    });

    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

    let airdropId: number | null = null;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: HumanDropABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'AirdropCreated') {
          airdropId = Number((decoded.args as unknown as { airdropId: bigint }).airdropId);
          break;
        }
      } catch {
        // not our event
      }
    }

    // Fund contract: worst case amountOrb * maxClaims
    const fundingAmount = amountOrbWei * BigInt(body.maxClaims);
    const transferHash = await walletClient.writeContract({
      address: body.tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'transfer',
      args: [HUMANDROP_ADDRESS, fundingAmount],
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
