import { NextRequest, NextResponse } from 'next/server';
import { parseUnits, parseEther, decodeEventLog } from 'viem';
import { publicClient, getWalletClient, FAIR_LAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';
import ERC20ABI from '@/abi/ERC20.json';
import { getAuthSession } from '@/lib/auth';

interface CreateLaunchBody {
  tokenAddress: string;
  totalTokens: string;
  hardCap: string;
  softCap: string;
  durationHours: number;
  maxPerWallet: string;
  startPrice: string;
  endPrice: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!FAIR_LAUNCH_ADDRESS) {
      return NextResponse.json({ error: 'FairLaunch not configured' }, { status: 500 });
    }

    const body = (await req.json()) as CreateLaunchBody;

    if (!body.tokenAddress || !body.totalTokens || !body.hardCap || !body.softCap || !body.durationHours || !body.startPrice || !body.endPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalTokensWei = parseUnits(body.totalTokens, 18);
    const hardCapWei = parseEther(body.hardCap);
    const softCapWei = parseEther(body.softCap);
    const duration = BigInt(Math.floor(body.durationHours * 3600));
    const maxPerWalletWei = parseEther(body.maxPerWallet || '0');
    const startPriceWei = parseEther(body.startPrice);
    const endPriceWei = parseEther(body.endPrice);

    // Validate
    if (endPriceWei <= startPriceWei) {
      return NextResponse.json({ error: 'End price must be greater than start price' }, { status: 400 });
    }
    if (softCapWei > hardCapWei && hardCapWei !== BigInt(0)) {
      return NextResponse.json({ error: 'Soft cap must be <= hard cap' }, { status: 400 });
    }

    const walletClient = getWalletClient();
    const tokenAddr = body.tokenAddress as `0x${string}`;

    // Step 1: Approve tokens to FairLaunch (createLaunch uses safeTransferFrom)
    const approveHash = await walletClient.writeContract({
      address: tokenAddr,
      abi: ERC20ABI,
      functionName: 'approve',
      args: [FAIR_LAUNCH_ADDRESS, totalTokensWei],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Step 2: Create the launch
    const createHash = await walletClient.writeContract({
      address: FAIR_LAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'createLaunch',
      args: [tokenAddr, totalTokensWei, hardCapWei, softCapWei, duration, maxPerWalletWei, startPriceWei, endPriceWei],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

    // Parse launchId from return value (it's also in events)
    let launchId: number | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: FairLaunchABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'LaunchCreated') {
          launchId = Number((decoded.args as unknown as { launchId: bigint }).launchId);
          break;
        }
      } catch {
        // not our event
      }
    }

    return NextResponse.json({
      success: true,
      launchId,
      txHash: createHash,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
