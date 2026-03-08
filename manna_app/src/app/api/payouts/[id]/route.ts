import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, BATCH_PAYOUT_ADDRESS } from '@/lib/contracts';
import BatchPayoutABI from '@/abi/BatchPayout.json';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payout = (await publicClient.readContract({
      address: BATCH_PAYOUT_ADDRESS,
      abi: BatchPayoutABI,
      functionName: 'getPayout',
      args: [BigInt(id)],
    })) as {
      token: string;
      sender: string;
      totalAmount: bigint;
      recipientCount: bigint;
      timestamp: bigint;
    };

    return NextResponse.json({
      payout: {
        id: Number(id),
        token: payout.token,
        sender: payout.sender,
        totalAmount: formatUnits(payout.totalAmount, 18),
        recipientCount: Number(payout.recipientCount),
        timestamp: Number(payout.timestamp),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
