import { NextResponse } from 'next/server';
import { formatUnits, formatEther } from 'viem';
import { publicClient, FAIR_LAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';

export async function GET() {
  try {
    if (!FAIR_LAUNCH_ADDRESS) {
      return NextResponse.json({ error: 'FairLaunch not configured' }, { status: 500 });
    }

    const nextId = (await publicClient.readContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'nextLaunchId',
    })) as bigint;

    const launches = [];
    for (let i = 0; i < Number(nextId); i++) {
      const launch = (await publicClient.readContract({
        address: FAIR_LAUNCH_ADDRESS,
        abi: FairLaunchABI,
        functionName: 'getLaunch',
        args: [BigInt(i)],
      })) as {
        token: string;
        creator: string;
        totalTokens: bigint;
        tokensSold: bigint;
        hardCap: bigint;
        softCap: bigint;
        raised: bigint;
        startTime: bigint;
        endTime: bigint;
        maxPerWallet: bigint;
        startPrice: bigint;
        endPrice: bigint;
        finalized: boolean;
        success: boolean;
      };

      let currentPrice = '0';
      if (!launch.finalized) {
        try {
          const price = (await publicClient.readContract({
            address: FAIR_LAUNCH_ADDRESS,
            abi: FairLaunchABI,
            functionName: 'getCurrentPrice',
            args: [BigInt(i)],
          })) as bigint;
          currentPrice = formatEther(price);
        } catch {
          // launch may have no tokens
        }
      }

      const now = Math.floor(Date.now() / 1000);
      let status: 'active' | 'ended' | 'succeeded' | 'failed' = 'active';
      if (launch.finalized) {
        status = launch.success ? 'succeeded' : 'failed';
      } else if (Number(launch.endTime) < now) {
        status = 'ended';
      }

      launches.push({
        id: i,
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
      });
    }

    return NextResponse.json({ launches });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
