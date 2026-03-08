import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient } from '@/lib/contracts';
import ERC20ABI from '@/abi/ERC20.json';

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params;
    const wallet = req.nextUrl.searchParams.get('wallet');
    const addr = address as `0x${string}`;

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      publicClient.readContract({ address: addr, abi: ERC20ABI, functionName: 'name' }) as Promise<string>,
      publicClient.readContract({ address: addr, abi: ERC20ABI, functionName: 'symbol' }) as Promise<string>,
      publicClient.readContract({ address: addr, abi: ERC20ABI, functionName: 'decimals' }) as Promise<number>,
      publicClient.readContract({ address: addr, abi: ERC20ABI, functionName: 'totalSupply' }) as Promise<bigint>,
    ]);

    const token: Record<string, unknown> = {
      address,
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: formatUnits(totalSupply, Number(decimals)),
    };

    if (wallet) {
      try {
        const balance = await publicClient.readContract({
          address: addr, abi: ERC20ABI, functionName: 'balanceOf', args: [wallet as `0x${string}`],
        }) as bigint;
        token.userBalance = formatUnits(balance, Number(decimals));
      } catch { /* balance unavailable */ }
    }

    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
