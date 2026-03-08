import { NextResponse } from 'next/server';
import { publicClient, getWalletClient, HUMANDROP_ADDRESS, FAIR_LAUNCH_ADDRESS, MANNA_INDEX_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';
import FairLaunchABI from '@/abi/FairLaunch.json';
import MannaIndexABI from '@/abi/MannaIndex.json';

export async function GET() {
  try {
    const walletClient = getWalletClient();

    // Read counts from contracts
    let totalAirdrops = BigInt(0);
    let totalLaunches = BigInt(0);

    try {
      totalAirdrops = await publicClient.readContract({
        address: HUMANDROP_ADDRESS,
        abi: HumanDropABI,
        functionName: 'nextAirdropId',
      }) as bigint;
    } catch { /* contract may not exist yet */ }

    try {
      totalLaunches = await publicClient.readContract({
        address: FAIR_LAUNCH_ADDRESS,
        abi: FairLaunchABI,
        functionName: 'nextLaunchId',
      }) as bigint;
    } catch { /* contract may not exist yet */ }

    // Write aggregated stats to MannaIndex
    const hash = await walletClient.writeContract({
      address: MANNA_INDEX_ADDRESS,
      abi: MannaIndexABI,
      functionName: 'updateStats',
      args: [totalAirdrops, totalLaunches, BigInt(0), BigInt(0)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      totalAirdrops: totalAirdrops.toString(),
      totalLaunches: totalLaunches.toString(),
      txHash: hash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
