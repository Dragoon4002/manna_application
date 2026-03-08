import { NextResponse } from 'next/server';
import { formatEther } from 'viem';
import { publicClient, MANNA_INDEX_ADDRESS } from '@/lib/contracts';
import MannaIndexABI from '@/abi/MannaIndex.json';

const CHAINS = ['arbitrum-sepolia', 'world-chain', 'base-sepolia'];

export async function GET() {
  try {
    if (!MANNA_INDEX_ADDRESS) {
      return NextResponse.json({ error: 'MannaIndex not configured' }, { status: 500 });
    }

    const result = (await publicClient.readContract({
      address: MANNA_INDEX_ADDRESS,
      abi: MannaIndexABI,
      functionName: 'getStats',
    })) as {
      totalAirdrops: bigint;
      totalLaunches: bigint;
      totalUsers: bigint;
      totalVolume: bigint;
      lastUpdate: bigint;
    };

    const chainStats: Record<string, { airdrops: number; launches: number; users: number; volume: string }> = {};
    for (const chain of CHAINS) {
      try {
        const cs = (await publicClient.readContract({
          address: MANNA_INDEX_ADDRESS,
          abi: MannaIndexABI,
          functionName: 'getChainStats',
          args: [chain],
        })) as { airdrops: bigint; launches: bigint; users: bigint; volume: bigint };

        chainStats[chain] = {
          airdrops: Number(cs.airdrops),
          launches: Number(cs.launches),
          users: Number(cs.users),
          volume: formatEther(cs.volume),
        };
      } catch {
        // chain stats not set yet
      }
    }

    return NextResponse.json({
      stats: {
        totalAirdrops: Number(result.totalAirdrops),
        totalLaunches: Number(result.totalLaunches),
        totalUsers: Number(result.totalUsers),
        totalVolume: formatEther(result.totalVolume),
        lastUpdate: Number(result.lastUpdate),
        chainStats,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
