import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient } from '@/lib/contracts';
import BatchPayoutABI from '@/abi/BatchPayout.json';

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get('wallet');
  const contractAddress = process.env.NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS as `0x${string}`;

  if (!wallet || !contractAddress) {
    return NextResponse.json({ payouts: [] });
  }

  try {
    const payoutIds = (await publicClient.readContract({
      address: contractAddress,
      abi: BatchPayoutABI,
      functionName: 'getPayouts',
      args: [wallet as `0x${string}`],
    })) as bigint[];

    const payouts = await Promise.all(
      payoutIds.map(async (id) => {
        const p = (await publicClient.readContract({
          address: contractAddress,
          abi: BatchPayoutABI,
          functionName: 'getPayout',
          args: [id],
        })) as { token: string; sender: string; totalAmount: bigint; recipientCount: bigint; timestamp: bigint };

        return {
          id: Number(id),
          token: p.token,
          sender: p.sender,
          totalAmount: formatUnits(p.totalAmount, 18),
          recipientCount: Number(p.recipientCount),
          timestamp: Number(p.timestamp),
        };
      })
    );

    return NextResponse.json({ payouts });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
