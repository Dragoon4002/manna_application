import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, STAKING_VAULT_ADDRESS } from '@/lib/contracts';
import StakingVaultABI from '@/abi/StakingVault.json';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const posId = BigInt(id);

    const [position, pendingRewards, owner] = await Promise.all([
      publicClient.readContract({ address: STAKING_VAULT_ADDRESS, abi: StakingVaultABI, functionName: 'getPosition', args: [posId] }) as Promise<{ amount: bigint; stakedAt: bigint; lockUntil: bigint; rewardsClaimed: bigint; active: boolean }>,
      publicClient.readContract({ address: STAKING_VAULT_ADDRESS, abi: StakingVaultABI, functionName: 'pendingRewards', args: [posId] }) as Promise<bigint>,
      publicClient.readContract({ address: STAKING_VAULT_ADDRESS, abi: StakingVaultABI, functionName: 'positionOwner', args: [posId] }) as Promise<string>,
    ]);

    const now = Math.floor(Date.now() / 1000);
    const locked = Number(position.lockUntil) > now;

    return NextResponse.json({
      position: {
        id: Number(id),
        amount: formatUnits(position.amount, 18),
        stakedAt: Number(position.stakedAt),
        lockUntil: Number(position.lockUntil),
        rewardsClaimed: formatUnits(position.rewardsClaimed, 18),
        pendingRewards: formatUnits(pendingRewards, 18),
        active: position.active,
        owner,
        locked,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
