import { NextResponse } from 'next/server';
import { publicClient, getWalletClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

export async function GET() {
  try {
    const walletClient = getWalletClient();

    const nextId = await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'nextAirdropId',
    }) as bigint;

    const now = BigInt(Math.floor(Date.now() / 1000));
    let reclaimed = 0;

    for (let i = BigInt(0); i < nextId; i++) {
      try {
        const airdrop = await publicClient.readContract({
          address: HUMANDROP_ADDRESS,
          abi: HumanDropABI,
          functionName: 'airdrops',
          args: [i],
        }) as [string, bigint, bigint, bigint, bigint, bigint, string, boolean];

        const [, , , , , expiry, , active] = airdrop;

        if (active && expiry < now) {
          const hash = await walletClient.writeContract({
            address: HUMANDROP_ADDRESS,
            abi: HumanDropABI,
            functionName: 'withdraw',
            args: [i],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          reclaimed++;
        }
      } catch {
        // skip individual airdrop errors
      }
    }

    return NextResponse.json({ success: true, reclaimed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
