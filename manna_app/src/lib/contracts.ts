import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

const rpc = process.env.ARBITRUM_SEPOLIA_RPC!;

export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(rpc),
});

export function getWalletClient() {
  const key = process.env.CREATOR_PRIVATE_KEY;
  if (!key) throw new Error('CREATOR_PRIVATE_KEY not set');
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpc) });
}

export const HUMANDROP_ADDRESS = process.env.NEXT_PUBLIC_HUMANDROP_ADDRESS as `0x${string}`;
export const VERIFIER_ADDRESS = process.env.NEXT_PUBLIC_WORLD_ID_VERIFIER_ADDRESS as `0x${string}`;
export const HDT_ADDRESS = process.env.NEXT_PUBLIC_HDT_ADDRESS as `0x${string}`;
export const STAKING_VAULT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_VAULT_ADDRESS as `0x${string}`;
export const BATCH_PAYOUT_ADDRESS = process.env.NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS as `0x${string}`;
export const VESTING_VAULT_ADDRESS = process.env.NEXT_PUBLIC_VESTING_VAULT_ADDRESS as `0x${string}`;
export const FAIR_LAUNCH_ADDRESS = process.env.NEXT_PUBLIC_FAIR_LAUNCH_ADDRESS as `0x${string}`;
export const TOKEN_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as `0x${string}`;
export const MANNA_INDEX_ADDRESS = process.env.NEXT_PUBLIC_MANNA_INDEX_ADDRESS as `0x${string}`;
