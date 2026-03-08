import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { publicClient, getWalletClient } from '@/lib/contracts';
import ERC20ABI from '@/abi/ERC20.json';
import { getAuthSession } from '@/lib/auth';

interface TransferBody {
  tokenAddress: string;
  to: string;
  amount: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as TransferBody;

    if (!body.tokenAddress || !body.to || !body.amount) {
      return NextResponse.json({ error: 'Missing fields: tokenAddress, to, amount' }, { status: 400 });
    }

    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: body.tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'transfer',
      args: [body.to as `0x${string}`, parseUnits(body.amount, 18)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
