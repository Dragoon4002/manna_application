import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient } from '@/lib/contracts';
import VestingVaultABI from '@/abi/VestingVault.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  const role = searchParams.get('role') ?? 'recipient'; // 'recipient' | 'creator'
  const contractAddress = process.env.NEXT_PUBLIC_VESTING_VAULT_ADDRESS as `0x${string}`;

  if (!wallet || !contractAddress) {
    return NextResponse.json({ schedules: [] });
  }

  try {
    const fn = role === 'creator' ? 'getCreatorSchedules' : 'getRecipientSchedules';
    const scheduleIds = (await publicClient.readContract({
      address: contractAddress,
      abi: VestingVaultABI,
      functionName: fn,
      args: [wallet as `0x${string}`],
    })) as bigint[];

    const schedules = await Promise.all(
      scheduleIds.map(async (id) => {
        const s = (await publicClient.readContract({
          address: contractAddress,
          abi: VestingVaultABI,
          functionName: 'getSchedule',
          args: [id],
        })) as {
          token: string; creator: string; recipient: string;
          totalAmount: bigint; claimed: bigint; start: bigint;
          cliff: bigint; duration: bigint; revocable: boolean; revoked: boolean;
        };

        const vested = (await publicClient.readContract({
          address: contractAddress,
          abi: VestingVaultABI,
          functionName: 'vestedAmount',
          args: [id],
        })) as bigint;

        return {
          id: Number(id),
          token: s.token,
          creator: s.creator,
          recipient: s.recipient,
          totalAmount: formatUnits(s.totalAmount, 18),
          claimed: formatUnits(s.claimed, 18),
          vestedAmount: formatUnits(vested, 18),
          claimable: formatUnits(vested - s.claimed, 18),
          start: Number(s.start),
          cliff: Number(s.cliff),
          duration: Number(s.duration),
          revocable: s.revocable,
          revoked: s.revoked,
        };
      })
    );

    return NextResponse.json({ schedules });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
