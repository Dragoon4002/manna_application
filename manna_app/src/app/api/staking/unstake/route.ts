import { NextRequest, NextResponse } from 'next/server';
import { publicClient, getWalletClient, STAKING_VAULT_ADDRESS } from '@/lib/contracts';
import StakingVaultABI from '@/abi/StakingVault.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { positionId } = (await req.json()) as { positionId: number };

    if (!STAKING_VAULT_ADDRESS) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: STAKING_VAULT_ADDRESS,
      abi: StakingVaultABI,
      functionName: 'unstake',
      args: [BigInt(positionId)],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
