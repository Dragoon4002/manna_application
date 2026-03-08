import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, VESTING_VAULT_ADDRESS } from '@/lib/contracts';
import VestingVaultABI from '@/abi/VestingVault.json';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const schedId = BigInt(id);

    const [schedule, vested] = await Promise.all([
      publicClient.readContract({ address: VESTING_VAULT_ADDRESS, abi: VestingVaultABI, functionName: 'getSchedule', args: [schedId] }) as Promise<{
        token: string; creator: string; recipient: string;
        totalAmount: bigint; claimed: bigint;
        start: bigint; cliff: bigint; duration: bigint;
        revocable: boolean; revoked: boolean;
      }>,
      publicClient.readContract({ address: VESTING_VAULT_ADDRESS, abi: VestingVaultABI, functionName: 'vestedAmount', args: [schedId] }) as Promise<bigint>,
    ]);

    const claimable = vested > schedule.claimed ? formatUnits(vested - schedule.claimed, 18) : '0';

    return NextResponse.json({
      schedule: {
        id: Number(id),
        token: schedule.token,
        creator: schedule.creator,
        recipient: schedule.recipient,
        totalAmount: formatUnits(schedule.totalAmount, 18),
        claimed: formatUnits(schedule.claimed, 18),
        vestedAmount: formatUnits(vested, 18),
        claimable,
        start: Number(schedule.start),
        cliff: Number(schedule.cliff),
        duration: Number(schedule.duration),
        revocable: schedule.revocable,
        revoked: schedule.revoked,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
