import { NextResponse } from 'next/server';
import { publicClient, getWalletClient, FAIR_LAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';

export async function GET() {
  try {
    const walletClient = getWalletClient();

    const nextId = await publicClient.readContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'nextLaunchId',
    }) as bigint;

    const now = BigInt(Math.floor(Date.now() / 1000));
    let finalized = 0;

    for (let i = BigInt(0); i < nextId; i++) {
      try {
        const launch = await publicClient.readContract({
          address: FAIR_LAUNCH_ADDRESS,
          abi: FairLaunchABI,
          functionName: 'getLaunch',
          args: [i],
        }) as { finalized: boolean; endTime: bigint };

        if (!launch.finalized && launch.endTime < now) {
          const hash = await walletClient.writeContract({
            address: FAIR_LAUNCH_ADDRESS,
            abi: FairLaunchABI,
            functionName: 'finalize',
            args: [i],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          finalized++;
        }
      } catch {
        // skip individual launch errors
      }
    }

    return NextResponse.json({ success: true, finalized });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
