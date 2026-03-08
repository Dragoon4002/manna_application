import { NextResponse } from 'next/server';
import { publicClient, getWalletClient, TOKEN_FACTORY_ADDRESS } from '@/lib/contracts';
import TokenFactoryABI from '@/abi/TokenFactory.json';
import ERC20ABI from '@/abi/ERC20.json';
import { formatUnits } from 'viem';

export async function GET() {
  try {
    const wallet = getWalletClient().account.address;

    const addresses = await publicClient.readContract({
      address: TOKEN_FACTORY_ADDRESS,
      abi: TokenFactoryABI,
      functionName: 'getDeployedTokens',
      args: [wallet],
    }) as string[];

    const tokens = await Promise.all(
      addresses.map(async (addr) => {
        const tokenAddr = addr as `0x${string}`;
        try {
          const [name, symbol, balance, totalSupply, decimals] = await Promise.all([
            publicClient.readContract({ address: tokenAddr, abi: ERC20ABI, functionName: 'name' }),
            publicClient.readContract({ address: tokenAddr, abi: ERC20ABI, functionName: 'symbol' }),
            publicClient.readContract({ address: tokenAddr, abi: ERC20ABI, functionName: 'balanceOf', args: [wallet] }),
            publicClient.readContract({ address: tokenAddr, abi: ERC20ABI, functionName: 'totalSupply' }),
            publicClient.readContract({ address: tokenAddr, abi: ERC20ABI, functionName: 'decimals' }),
          ]);
          return {
            address: addr,
            name: name as string,
            symbol: symbol as string,
            balance: formatUnits(balance as bigint, Number(decimals)),
            totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
            decimals: Number(decimals),
          };
        } catch {
          return { address: addr, name: '?', symbol: '?', balance: '0', totalSupply: '0', decimals: 18 };
        }
      }),
    );

    return NextResponse.json({ tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ tokens: [], error: message }, { status: 500 });
  }
}
