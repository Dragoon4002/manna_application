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
    const hasClaimed = await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'hasClaimed',
      args: [BigInt(airdropId), BigInt(nullifierHash)],
    });

    return NextResponse.json({ eligible: !hasClaimed, hasClaimed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
