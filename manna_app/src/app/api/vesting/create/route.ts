import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { publicClient, getWalletClient, VESTING_VAULT_ADDRESS } from '@/lib/contracts';
import VestingVaultABI from '@/abi/VestingVault.json';
import ERC20ABI from '@/abi/ERC20.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenAddress, recipient, amount, cliffDays, durationDays, revocable } = (await req.json()) as {
      tokenAddress: string;
      recipient: string;
      amount: string;
      cliffDays: number;
      durationDays: number;
      revocable: boolean;
    };

    if (!VESTING_VAULT_ADDRESS) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const amountWei = parseUnits(amount, 18);
    const walletClient = getWalletClient();

    // Approve token transfer to vesting vault
    const approveHash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [VESTING_VAULT_ADDRESS, amountWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Create vesting schedule
    const hash = await walletClient.writeContract({
      address: VESTING_VAULT_ADDRESS,
      abi: VestingVaultABI,
      functionName: 'create',
      args: [
        tokenAddress as `0x${string}`,
        recipient as `0x${string}`,
        amountWei,
        BigInt(cliffDays),
        BigInt(durationDays),
        revocable,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
