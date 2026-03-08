import {
  HTTPCapability,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  prepareReportRequest,
  bytesToHex,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, type Address } from "viem";

// --- Types ---

type Config = {
  mannaTokenWorldChain: string;
  mannaTokenArbSepolia: string;
  mannaTokenBaseSepolia: string;
  authorizedEVMAddress: string;
};

interface MintRequest {
  tokenAddress: string;
  to: string;
  amount: string;
  targetChain: "world-chain" | "arbitrum-sepolia" | "base-sepolia";
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

// --- ABI ---

const mintAbi = [{
  name: "mint",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "address", name: "to" },
    { type: "uint256", name: "amount" }
  ],
  outputs: []
}] as const;

// --- Workflow ---

const onHttpTrigger = async (runtime: Runtime<Config>, payload: { input: Uint8Array }) => {
  const inputStr = new TextDecoder().decode(payload.input);
  const request: MintRequest = JSON.parse(inputStr);

  runtime.log(`Mint ${request.amount} tokens to ${request.to} on ${request.targetChain}`);

  // Select chain
  let chainSelector: string;
  switch (request.targetChain) {
    case "world-chain":
      chainSelector = WORLD_CHAIN;
      break;
    case "arbitrum-sepolia":
      chainSelector = ARB_SEPOLIA;
      break;
    case "base-sepolia":
      chainSelector = BASE_SEPOLIA;
      break;
    default:
      throw new Error(`INVALID_CHAIN: ${request.targetChain}`);
  }

  const client = new EVMClient(chainSelector);

  // Prepare mint call
  const mintCalldata = encodeFunctionData({
    abi: mintAbi,
    functionName: "mint",
    args: [request.to as Address, BigInt(request.amount)],
  });

  runtime.log(`Minting via token at ${request.tokenAddress}`);

  const report = runtime.report(prepareReportRequest(mintCalldata)).result();

  const writeResult = client.writeReport(runtime, {
    receiver: request.tokenAddress,
    report: report,
    gasConfig: { gasLimit: "300000" },
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    throw new Error(`MINT_FAILED: ${writeResult.txStatus}`);
  }

  runtime.log(`Mint tx status: ${writeResult.txStatus}`);

  const txHash = writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x";

  return {
    success: true,
    chain: request.targetChain,
    txHash,
    message: "Tokens minted successfully",
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
