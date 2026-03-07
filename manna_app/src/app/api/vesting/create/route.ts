import { NextRequest, NextResponse } from 'next/server';
import { parseUnits } from 'viem';
import VestingVaultABI from '@/abi/VestingVault.json';
import ERC20ABI from '@/abi/ERC20.json';

export async function POST(req: NextRequest) {
  try {
    const { tokenAddress, recipient, amount, cliffDays, durationDays, revocable } = (await req.json()) as {
      tokenAddress: string;
      recipient: string;
      amount: string;
      cliffDays: number;
      durationDays: number;
      revocable: boolean;
    };

    const vestingAddress = process.env.NEXT_PUBLIC_VESTING_VAULT_ADDRESS;
    if (!vestingAddress) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    const amountWei = parseUnits(amount, 18);

    return NextResponse.json({
      transactions: [
        {
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [vestingAddress, amountWei.toString()],
        },
        {
          address: vestingAddress,
          abi: VestingVaultABI,
          functionName: 'create',
          args: [tokenAddress, recipient, amountWei.toString(), cliffDays.toString(), durationDays.toString(), revocable],
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
