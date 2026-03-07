import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

export async function GET() {
  try {
    const nextId = (await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'nextAirdropId',
    })) as bigint;

    const airdrops = [];
    for (let i = 0; i < Number(nextId); i++) {
      const airdrop = (await publicClient.readContract({
        address: HUMANDROP_ADDRESS,
        abi: HumanDropABI,
        functionName: 'getAirdrop',
        args: [BigInt(i)],
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

      if (!airdrop.active) continue;
      if (Number(airdrop.expiry) * 1000 < Date.now()) continue;

      airdrops.push({
        id: i,
        token: airdrop.token,
        amountOrb: formatUnits(airdrop.amountOrb, 18),
        amountDevice: formatUnits(airdrop.amountDevice, 18),
        totalClaimed: Number(airdrop.totalClaimed),
        maxClaims: Number(airdrop.maxClaims),
        expiry: Number(airdrop.expiry),
        creator: airdrop.creator,
      });
    }

    return NextResponse.json({ airdrops });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
