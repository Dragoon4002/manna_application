import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { publicClient, HDT_ADDRESS, STAKING_VAULT_ADDRESS, VESTING_VAULT_ADDRESS } from '@/lib/contracts';
import ERC20ABI from '@/abi/ERC20.json';
import StakingVaultABI from '@/abi/StakingVault.json';
import VestingVaultABI from '@/abi/VestingVault.json';

export async function GET(req: NextRequest) {
  try {
    const wallet = new URL(req.url).searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
    }

    const walletAddr = wallet as `0x${string}`;

    // Token balance
    const balances: { token: string; symbol: string; balance: string }[] = [];
    if (HDT_ADDRESS) {
      try {
        const bal = (await publicClient.readContract({
          address: HDT_ADDRESS,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [walletAddr],
        })) as bigint;

        balances.push({ token: HDT_ADDRESS, symbol: 'HDT', balance: formatUnits(bal, 18) });
      } catch {
        balances.push({ token: HDT_ADDRESS, symbol: 'HDT', balance: '0' });
      }
    }

    // Staking positions
    const staking: { id: number; amount: string; stakedAt: number; lockUntil: number; pendingRewards: string; active: boolean }[] = [];
    if (STAKING_VAULT_ADDRESS) {
      try {
        const positionIds = (await publicClient.readContract({
          address: STAKING_VAULT_ADDRESS,
          abi: StakingVaultABI,
          functionName: 'getPositions',
          args: [walletAddr],
        })) as bigint[];

        for (const pid of positionIds) {
          const pos = (await publicClient.readContract({
            address: STAKING_VAULT_ADDRESS,
            abi: StakingVaultABI,
            functionName: 'getPosition',
            args: [pid],
          })) as { amount: bigint; stakedAt: bigint; lockUntil: bigint; rewardsClaimed: bigint; active: boolean };

          let pendingRewards = '0';
          if (pos.active) {
            try {
              const pr = (await publicClient.readContract({
                address: STAKING_VAULT_ADDRESS,
                abi: StakingVaultABI,
                functionName: 'pendingRewards',
                args: [pid],
              })) as bigint;
              pendingRewards = formatUnits(pr, 18);
            } catch { /* no pending */ }
          }

          staking.push({
            id: Number(pid),
            amount: formatUnits(pos.amount, 18),
            stakedAt: Number(pos.stakedAt),
            lockUntil: Number(pos.lockUntil),
            pendingRewards,
            active: pos.active,
          });
        }
      } catch { /* no positions */ }
    }

    // Vesting schedules
    const vesting: { id: number; token: string; totalAmount: string; claimed: string; cliff: number; duration: number; revoked: boolean }[] = [];
    if (VESTING_VAULT_ADDRESS) {
      try {
        const scheduleIds = (await publicClient.readContract({
          address: VESTING_VAULT_ADDRESS,
          abi: VestingVaultABI,
          functionName: 'getRecipientSchedules',
          args: [walletAddr],
        })) as bigint[];

        for (const sid of scheduleIds) {
          const sch = (await publicClient.readContract({
            address: VESTING_VAULT_ADDRESS,
            abi: VestingVaultABI,
            functionName: 'getSchedule',
            args: [sid],
          })) as { token: string; creator: string; recipient: string; totalAmount: bigint; claimed: bigint; start: bigint; cliff: bigint; duration: bigint; revocable: boolean; revoked: boolean };

          vesting.push({
            id: Number(sid),
            token: sch.token,
            totalAmount: formatUnits(sch.totalAmount, 18),
            claimed: formatUnits(sch.claimed, 18),
            cliff: Number(sch.cliff),
            duration: Number(sch.duration),
            revoked: sch.revoked,
          });
        }
      } catch { /* no schedules */ }
    }

    return NextResponse.json({ wallet, balances, staking, vesting });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
