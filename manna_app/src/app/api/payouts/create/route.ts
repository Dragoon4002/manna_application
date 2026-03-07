import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import BatchPayoutABI from '@/abi/BatchPayout.json';
import ERC20ABI from '@/abi/ERC20.json';

export async function POST(req: NextRequest) {
  try {
    const { tokenAddress, recipients, amounts } = (await req.json()) as {
      tokenAddress: string;
      recipients: string[];
      amounts: string[];
    };

    const payoutAddress = process.env.NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS;
    if (!payoutAddress) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    if (recipients.length !== amounts.length || recipients.length === 0) {
      return NextResponse.json({ error: 'Recipients/amounts mismatch or empty' }, { status: 400 });
    }

    const amountsWei = amounts.map((a) => parseUnits(a, 18));
    const totalWei = amountsWei.reduce((sum, a) => sum + a, BigInt(0));

    return NextResponse.json({
      transactions: [
        {
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [payoutAddress, totalWei.toString()],
        },
        {
          address: payoutAddress,
          abi: BatchPayoutABI,
          functionName: 'distribute',
          args: [tokenAddress, recipients, amountsWei.map((a) => a.toString())],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
