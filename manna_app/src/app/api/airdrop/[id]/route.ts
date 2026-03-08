import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const airdrop = (await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'getAirdrop',
      args: [BigInt(id)],
    })) as {
      token: string;
      amountOrb: bigint;
      amountDevice: bigint;
      totalClaimed: bigint;
      maxClaims: bigint;
      expiry: bigint;
      creator: string;
      active: boolean;
    };

    return NextResponse.json({
      airdrop: {
        id: Number(id),
        token: airdrop.token,
        amountOrb: formatUnits(airdrop.amountOrb, 18),
        amountDevice: formatUnits(airdrop.amountDevice, 18),
        totalClaimed: Number(airdrop.totalClaimed),
        maxClaims: Number(airdrop.maxClaims),
        expiry: Number(airdrop.expiry),
        creator: airdrop.creator,
        active: airdrop.active,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
