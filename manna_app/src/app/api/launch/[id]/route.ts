import { NextRequest, NextResponse } from 'next/server';
import { formatUnits, formatEther } from 'viem';
import { publicClient, FAIR_LAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wallet = req.nextUrl.searchParams.get('wallet');

    const launch = (await publicClient.readContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'getLaunch',
      args: [BigInt(id)],
    })) as {
      token: string; creator: string; totalTokens: bigint; tokensSold: bigint;
      hardCap: bigint; softCap: bigint; raised: bigint;
      startTime: bigint; endTime: bigint; maxPerWallet: bigint;
      startPrice: bigint; endPrice: bigint; finalized: boolean; success: boolean;
    };

    let currentPrice = '0';
    const now = Math.floor(Date.now() / 1000);
    if (!launch.finalized && Number(launch.endTime) > now) {
      try {
        const price = await publicClient.readContract({
          address: FAIR_LAUNCH_ADDRESS, abi: FairLaunchABI,
          functionName: 'getCurrentPrice', args: [BigInt(id)],
        }) as bigint;
        currentPrice = formatEther(price);
      } catch { /* may not be active */ }
    }

    // Determine status
    let status = 'active';
    if (launch.finalized) status = launch.success ? 'succeeded' : 'failed';
    else if (Number(launch.endTime) < now) status = 'ended';

    const result: Record<string, unknown> = {
      launch: {
        id: Number(id),
        token: launch.token,
        creator: launch.creator,
        totalTokens: formatUnits(launch.totalTokens, 18),
        tokensSold: formatUnits(launch.tokensSold, 18),
        hardCap: formatEther(launch.hardCap),
        softCap: formatEther(launch.softCap),
        raised: formatEther(launch.raised),
        startTime: Number(launch.startTime),
        endTime: Number(launch.endTime),
        maxPerWallet: formatEther(launch.maxPerWallet),
        startPrice: formatEther(launch.startPrice),
        endPrice: formatEther(launch.endPrice),
        currentPrice,
        status,
        finalized: launch.finalized,
      },
    };

    if (wallet) {
      const addr = wallet as `0x${string}`;
      try {
        const [contribution, allocation, claimed] = await Promise.all([
          publicClient.readContract({ address: FAIR_LAUNCH_ADDRESS, abi: FairLaunchABI, functionName: 'contributions', args: [BigInt(id), addr] }) as Promise<bigint>,
          publicClient.readContract({ address: FAIR_LAUNCH_ADDRESS, abi: FairLaunchABI, functionName: 'tokenAllocations', args: [BigInt(id), addr] }) as Promise<bigint>,
          publicClient.readContract({ address: FAIR_LAUNCH_ADDRESS, abi: FairLaunchABI, functionName: 'claimed', args: [BigInt(id), addr] }) as Promise<boolean>,
        ]);
        result.userContribution = formatEther(contribution);
        result.userAllocation = formatUnits(allocation, 18);
        result.userClaimed = claimed;
      } catch { /* wallet data unavailable */ }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
