import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { keccak256, toBytes } from 'viem';
import { publicClient, getWalletClient, HUMANDROP_ADDRESS, VERIFIER_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';
import WorldIDVerifierABI from '@/abi/WorldIDVerifier.json';

interface ClaimRequestBody {
  airdropId: number;
  proof: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: string;
  };
  signal: string;
  action: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as ClaimRequestBody;

    // Debug mode: mock success (no on-chain tx)
    if (process.env.DEBUG_MODE === 'true') {
      const mockNullifier = body.proof?.nullifier_hash ?? `0xdebug${body.airdropId}`;
      return NextResponse.json({
        success: true,
        txHash: `0xdebugtx${Date.now().toString(16)}`,
        nullifierHash: mockNullifier,
        debug: true,
      });
    }

    // CRE mode: relay to deployed CRE workflow
    const creUrl = process.env.CRE_WORKFLOW_URL;
    if (creUrl) {
      const creResponse = await fetch(creUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!creResponse.ok) {
        const error = await creResponse.text();
        return NextResponse.json({ success: false, error }, { status: creResponse.status });
      }

      const result = await creResponse.json();
      return NextResponse.json({ success: true, ...result });
    }

    // Local mode: call contracts directly (bypasses World ID verification)
    // Derive unique nullifier per user if placeholder 0x0/0 was sent
    const rawNullifier = body.proof?.nullifier_hash && body.proof.nullifier_hash !== '0x0' && body.proof.nullifier_hash !== '0'
      ? body.proof.nullifier_hash
      : keccak256(toBytes(session.user.walletAddress + body.airdropId));
    const nullifierHash = BigInt(rawNullifier);
    const airdropId = BigInt(body.airdropId);
    // Use signal if it's a valid address, otherwise fall back to session wallet
    const receiver = (body.signal && body.signal.startsWith('0x') && body.signal.length === 42)
      ? body.signal as `0x${string}`
      : session.user.walletAddress as `0x${string}`;
    const level = body.proof.verification_level === 'orb' ? 1 : 2;

    // Check double-claim
    const hasClaimed = await publicClient.readContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'claimed',
      args: [airdropId, nullifierHash],
    });

    if (hasClaimed) {
      return NextResponse.json({ success: false, error: 'Already claimed' }, { status: 400 });
    }

    const walletClient = getWalletClient();

    // Claim tokens
    const claimHash = await walletClient.writeContract({
      address: HUMANDROP_ADDRESS,
      abi: HumanDropABI,
      functionName: 'claim',
      args: [airdropId, nullifierHash, receiver, level],
    });

    await publicClient.waitForTransactionReceipt({ hash: claimHash });

    // Register human in public registry
    try {
      const regHash = await walletClient.writeContract({
        address: VERIFIER_ADDRESS,
        abi: WorldIDVerifierABI,
        functionName: 'registerHuman',
        args: [nullifierHash, level],
      });
      await publicClient.waitForTransactionReceipt({ hash: regHash });
    } catch {
      // Non-fatal: human may already be registered
    }

    return NextResponse.json({
      success: true,
      txHash: claimHash,
      nullifierHash: body.proof.nullifier_hash,
      local: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
