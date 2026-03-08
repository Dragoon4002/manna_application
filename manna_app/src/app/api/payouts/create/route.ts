import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { publicClient, getWalletClient, BATCH_PAYOUT_ADDRESS } from '@/lib/contracts';
import BatchPayoutABI from '@/abi/BatchPayout.json';
import ERC20ABI from '@/abi/ERC20.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenAddress, recipients, amounts } = (await req.json()) as {
      tokenAddress: string;
      recipients: string[];
      amounts: string[];
    };

    if (!BATCH_PAYOUT_ADDRESS) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    if (recipients.length !== amounts.length || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients/amounts mismatch or empty' }, { status: 400 });
    }

    const amountsWei = amounts.map((a) => parseUnits(a, 18));
    const totalWei = amountsWei.reduce((sum, a) => sum + a, BigInt(0));
    const walletClient = getWalletClient();

    // Approve total token transfer to batch payout contract
    const approveHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [BATCH_PAYOUT_ADDRESS, totalWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Execute batch distribution
    const hash = await walletClient.writeContract({
      address: BATCH_PAYOUT_ADDRESS,
      abi: BatchPayoutABI,
      functionName: 'distribute',
      args: [tokenAddress as `0x${string}`, recipients as `0x${string}`[], amountsWei],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
