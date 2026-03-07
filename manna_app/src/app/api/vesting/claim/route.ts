import { NextRequest, NextResponse } from 'next/server';
import VestingVaultABI from '@/abi/VestingVault.json';

export async function POST(req: NextRequest) {
  try {
    const { scheduleId } = (await req.json()) as { scheduleId: number };
    const vestingAddress = process.env.NEXT_PUBLIC_VESTING_VAULT_ADDRESS;

    if (!vestingAddress) {
      return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
    }

    return NextResponse.json({
      transaction: {
        address: vestingAddress,
        abi: VestingVaultABI,
        functionName: 'claim',
        args: [scheduleId.toString()],
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
