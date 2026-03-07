import { NextRequest, NextResponse } from 'next/server';
import StakingVaultABI from '@/abi/StakingVault.json';

export async function POST(req: NextRequest) {
  try {
    const { positionId } = (await req.json()) as { positionId: number };
    const vaultAddress = process.env.NEXT_PUBLIC_STAKING_VAULT_ADDRESS;

    if (!vaultAddress) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    return NextResponse.json({
      transaction: {
        address: vaultAddress,
        abi: StakingVaultABI,
        functionName: 'claimRewards',
        args: [positionId.toString()],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
