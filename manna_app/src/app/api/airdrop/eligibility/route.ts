import { NextRequest, NextResponse } from 'next/server';
import { publicClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const airdropId = searchParams.get('airdropId');
  const nullifierHash = searchParams.get('nullifierHash');

  if (!airdropId || !nullifierHash) {
    return NextResponse.json({ error: 'Missing airdropId or nullifierHash' }, { status: 400 });
  }

  try {
    const eligible = await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'isEligible',
      args: [BigInt(airdropId), BigInt(nullifierHash)],
    });

    let reason = 'Eligible';
    if (!eligible) {
      const hasClaimed = await publicClient.readContract({
        address: HUMANDROP_ADDRESS,
        abi: HumanDropABI,
        functionName: 'hasClaimed',
        args: [BigInt(airdropId), BigInt(nullifierHash)],
      });

      if (hasClaimed) {
        reason = 'Already claimed';
      } else {
        const airdrop = (await publicClient.readContract({
          address: HUMANDROP_ADDRESS,
          abi: HumanDropABI,
          functionName: 'getAirdrop',
          args: [BigInt(airdropId)],
        })) as { active: boolean; expiry: bigint; totalClaimed: bigint; maxClaims: bigint };

        if (!airdrop.active) reason = 'Airdrop inactive';
        else if (Number(airdrop.expiry) < Math.floor(Date.now() / 1000)) reason = 'Airdrop expired';
        else if (Number(airdrop.totalClaimed) >= Number(airdrop.maxClaims)) reason = 'Max claims reached';
        else reason = 'Not eligible';
      }
    }

    return NextResponse.json({ eligible, reason });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
