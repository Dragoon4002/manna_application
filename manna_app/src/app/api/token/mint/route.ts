import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { publicClient, getWalletClient } from '@/lib/contracts';
import { parseUnits } from 'viem';

const mintAbi = [{
  type: 'function',
  name: 'mint',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}] as const;

interface MintRequestBody {
  tokenAddress: string;
  to: string;
  amount: string;
  targetChain?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as MintRequestBody;

    if (!body.tokenAddress || !body.to || !body.amount) {
      return NextResponse.json({ error: 'Missing required fields: tokenAddress, to, amount' }, { status: 400 });
    }

    // Debug mode: mock success
    if (process.env.DEBUG_MODE === 'true') {
      return NextResponse.json({
        success: true,
        txHash: `0xdebugtx${Date.now().toString(16)}`,
        chain: body.targetChain ?? 'arbitrum-sepolia',
        debug: true,
      });
    }

    // CRE mode: relay to deployed CRE workflow
    const creUrl = process.env.CRE_WORKFLOW_URL;
    if (creUrl) {
      const creResponse = await fetch(creUrl.replace('/claim', '/token-mint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: body.tokenAddress,
          to: body.to,
          amount: body.amount,
          targetChain: body.targetChain ?? 'arbitrum-sepolia',
        }),
      });

      if (!creResponse.ok) {
        const error = await creResponse.text();
        return NextResponse.json({ success: false, error }, { status: creResponse.status });
      }

      const result = await creResponse.json();
      return NextResponse.json({ success: true, ...result });
    }

    // Local mode: call mint directly
    const walletClient = getWalletClient();
    const mintHash = await walletClient.writeContract({
      address: body.tokenAddress as `0x${string}`,
      abi: mintAbi,
      functionName: 'mint',
      args: [body.to as `0x${string}`, parseUnits(body.amount, 18)],
    });

    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    return NextResponse.json({
      success: true,
      txHash: mintHash,
      chain: body.targetChain ?? 'arbitrum-sepolia',
      local: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
