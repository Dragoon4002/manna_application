import { NextRequest, NextResponse } from 'next/server';
import { publicClient, getWalletClient, VESTING_VAULT_ADDRESS } from '@/lib/contracts';
import VestingVaultABI from '@/abi/VestingVault.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = (await req.json()) as { scheduleId: number };

    if (!VESTING_VAULT_ADDRESS) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: VESTING_VAULT_ADDRESS,
      abi: VestingVaultABI,
      functionName: 'claim',
      args: [BigInt(scheduleId)],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
