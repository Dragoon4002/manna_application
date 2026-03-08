import { NextRequest, NextResponse } from 'next/server';
import { parseUnits, decodeEventLog } from 'viem';
import { publicClient, getWalletClient, TOKEN_FACTORY_ADDRESS } from '@/lib/contracts';
import TokenFactoryABI from '@/abi/TokenFactory.json';
import { getAuthSession } from '@/lib/auth';

interface DeployBody {
  name: string;
  symbol: string;
  initialSupply: string;
  decimals?: number;
  enableMinting?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as DeployBody;

    if (!body.name || !body.symbol || !body.initialSupply) {
      return NextResponse.json({ error: 'Missing fields: name, symbol, initialSupply' }, { status: 400 });
    }

    const walletClient = getWalletClient();
    const decimals = body.decimals ?? 18;
    const supplyWei = parseUnits(body.initialSupply, decimals);
    const owner = walletClient.account.address;

    const hash = await walletClient.writeContract({
      address: TOKEN_FACTORY_ADDRESS,
      abi: TokenFactoryABI,
      functionName: 'deployToken',
      args: [body.name, body.symbol, supplyWei, decimals, owner, body.enableMinting ?? true],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let tokenAddress: string | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: TokenFactoryABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'TokenDeployed') {
          tokenAddress = (decoded.args as unknown as { token: string }).token;
          break;
        }
      } catch { /* not our event */ }
    }

    return NextResponse.json({
      success: true,
      tokenAddress,
      txHash: hash,
      name: body.name,
      symbol: body.symbol,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
