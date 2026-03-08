import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import { publicClient, getWalletClient, STAKING_VAULT_ADDRESS, HDT_ADDRESS } from '@/lib/contracts';
import StakingVaultABI from '@/abi/StakingVault.json';
import ERC20ABI from '@/abi/ERC20.json';
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, lockDays, tokenAddress } = (await req.json()) as {
      amount: string;
      lockDays: number;
      tokenAddress?: string;
    };

    const token = (tokenAddress ?? HDT_ADDRESS) as `0x${string}`;

    if (!STAKING_VAULT_ADDRESS || !token) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const amountWei = parseUnits(amount, 18);
    const walletClient = getWalletClient();

    // Approve token transfer to staking vault
    const approveHash = await walletClient.writeContract({
      address: token,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [STAKING_VAULT_ADDRESS, amountWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Stake tokens
    const hash = await walletClient.writeContract({
      address: STAKING_VAULT_ADDRESS,
      abi: StakingVaultABI,
      functionName: 'stake',
      args: [amountWei, BigInt(lockDays)],
    });
    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
