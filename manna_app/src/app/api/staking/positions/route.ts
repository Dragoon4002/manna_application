import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient } from '@/lib/contracts';
import StakingVaultABI from '@/abi/StakingVault.json';

export async function GET(req: NextRequest) {
  const wallet = new URL(req.url).searchParams.get('wallet');
  const contractAddress = process.env.NEXT_PUBLIC_STAKING_VAULT_ADDRESS as `0x${string}`;

  if (!wallet || !contractAddress) {
    return NextResponse.json({ positions: [] });
  }

  try {
    const positionIds = (await publicClient.readContract({
      address: contractAddress,
      abi: StakingVaultABI,
      functionName: 'getPositions',
      args: [wallet as `0x${string}`],
    })) as bigint[];

    const positions = await Promise.all(
      positionIds.map(async (id) => {
        const pos = (await publicClient.readContract({
          address: contractAddress,
          abi: StakingVaultABI,
          functionName: 'getPosition',
          args: [id],
        })) as { amount: bigint; stakedAt: bigint; lockUntil: bigint; rewardsClaimed: bigint; active: boolean };

        const pending = (await publicClient.readContract({
          address: contractAddress,
          abi: StakingVaultABI,
          functionName: 'pendingRewards',
          args: [id],
        })) as bigint;

        return {
          id: Number(id),
          amount: formatUnits(pos.amount, 18),
          stakedAt: Number(pos.stakedAt),
          lockUntil: Number(pos.lockUntil),
          rewardsClaimed: formatUnits(pos.rewardsClaimed, 18),
          pendingRewards: formatUnits(pending, 18),
          active: pos.active,
        };
      })
    );

    return NextResponse.json({ positions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
