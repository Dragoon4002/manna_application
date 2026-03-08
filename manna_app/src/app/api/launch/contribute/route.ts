import { NextRequest, NextResponse } from 'next/server';
import { parseEther } from 'viem';
import { publicClient, getWalletClient, FAIR_LAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!FAIR_LAUNCH_ADDRESS) {
      return NextResponse.json({ error: 'FairLaunch not configured' }, { status: 500 });
    }

    const { launchId, amount } = (await req.json()) as { launchId: number; amount: string };

    if (launchId === undefined || !amount) {
      return NextResponse.json({ error: 'Missing launchId or amount' }, { status: 400 });
    }

    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'contribute',
      args: [BigInt(launchId)],
      value: parseEther(amount),
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
