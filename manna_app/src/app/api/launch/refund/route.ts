import { NextRequest, NextResponse } from 'next/server';
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

    const { launchId } = (await req.json()) as { launchId: number };
    if (launchId === undefined) {
      return NextResponse.json({ error: 'Missing launchId' }, { status: 400 });
    }

    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'refund',
      args: [BigInt(launchId)],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
