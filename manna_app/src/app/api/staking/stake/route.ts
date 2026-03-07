import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import StakingVaultABI from '@/abi/StakingVault.json';
import ERC20ABI from '@/abi/ERC20.json';

export async function POST(req: NextRequest) {
  try {
    const { amount, lockDays, tokenAddress } = (await req.json()) as {
      amount: string;
      lockDays: number;
      tokenAddress?: string;
    };

    const vaultAddress = process.env.NEXT_PUBLIC_STAKING_VAULT_ADDRESS;
    const token = tokenAddress ?? process.env.NEXT_PUBLIC_HDT_ADDRESS;

    if (!vaultAddress || !token) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const amountWei = parseUnits(amount, 18);

    return NextResponse.json({
      transactions: [
        {
          address: token,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [vaultAddress, amountWei.toString()],
        },
        {
          address: vaultAddress,
          abi: StakingVaultABI,
          functionName: 'stake',
          args: [amountWei.toString(), lockDays.toString()],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
