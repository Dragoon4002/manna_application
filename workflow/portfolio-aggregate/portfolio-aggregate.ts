import {
  HTTPCapability,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  encodeCallMsg,
  bytesToHex,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, type Hex, type Address } from "viem";

// --- Types ---

type Config = {
  authorizedEVMAddress: string;
};

interface PortfolioRequest {
  wallet: string;
  tokens: TokenConfig[];
}

interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
  chain: "world-chain" | "arbitrum-sepolia" | "base-sepolia";
}

interface TokenBalance {
  token: string;
  symbol: string;
  balance: string;
  chain: string;
  decimals: number;
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// --- ABI ---

const balanceOfAbi = [{
  name: "balanceOf",
  type: "function",
  stateMutability: "view",
  inputs: [{ type: "address", name: "account" }],
  outputs: [{ type: "uint256", name: "balance" }]
}] as const;

// --- Helpers ---

const getChainSelector = (chain: string): string => {
  switch (chain) {
    case "world-chain":
      return WORLD_CHAIN;
    case "arbitrum-sepolia":
      return ARB_SEPOLIA;
    case "base-sepolia":
      return BASE_SEPOLIA;
    default:
      throw new Error(`INVALID_CHAIN: ${chain}`);
  }
};

const getTokenBalance = (
  runtime: Runtime<Config>,
  client: EVMClient,
  tokenAddr: string,
  wallet: string
): bigint => {
  const calldata = encodeFunctionData({
    abi: balanceOfAbi,
    functionName: "balanceOf",
    args: [wallet as Address],
  });

  const result = client.callContract(runtime, {
    call: encodeCallMsg({
      from: ZERO_ADDR,
      to: tokenAddr as Address,
      data: calldata,
    }),
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  const hex = bytesToHex(result.data) as Hex;
  const [balance] = decodeFunctionResult({
    abi: balanceOfAbi,
    functionName: "balanceOf",
    data: hex,
  });

  return balance;
};

// --- Workflow ---

const onHttpTrigger = async (runtime: Runtime<Config>, payload: { input: Uint8Array }) => {
  const inputStr = new TextDecoder().decode(payload.input);
  const request: PortfolioRequest = JSON.parse(inputStr);

  runtime.log(`Portfolio aggregate for wallet: ${request.wallet}`);

  const balances: TokenBalance[] = [];

  for (const token of request.tokens) {
    try {
      const chainSelector = getChainSelector(token.chain);
      const client = new EVMClient(chainSelector);

      const balance = getTokenBalance(runtime, client, token.address, request.wallet);

      balances.push({
        token: token.address,
        symbol: token.symbol,
        balance: balance.toString(),
        chain: token.chain,
        decimals: token.decimals,
      });

      runtime.log(`${token.symbol} on ${token.chain}: ${balance.toString()}`);
    } catch (err) {
      runtime.log(`Error reading ${token.symbol} on ${token.chain}: ${err}`);
      balances.push({
        token: token.address,
        symbol: token.symbol,
        balance: "0",
        chain: token.chain,
        decimals: token.decimals,
      });
    }
  }

  return {
    success: true,
    wallet: request.wallet,
    balances,
  };
};

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability();

  return [
    handler(
      http.trigger({
        authorizedKeys: [{
          type: "KEY_TYPE_ECDSA_EVM",
          publicKey: config.authorizedEVMAddress,
        }],
      }),
      onHttpTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
