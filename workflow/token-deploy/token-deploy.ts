import {
  HTTPCapability,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  encodeCallMsg,
  prepareReportRequest,
  bytesToHex,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, type Hex, type Address } from "viem";
import { TokenFactoryAbi } from "./abi";

// --- Types ---

type Config = {
  tokenFactoryWorldChain: string;
  tokenFactoryArbSepolia: string;
  tokenFactoryBaseSepolia: string;
  authorizedEVMAddress: string; // For HTTP trigger auth
};

interface DeployRequest {
  creator: string;
  name: string;
  symbol: string;
  initialSupply: string;
  decimals: number;
  enableMinting: boolean;
  targetChain: "world-chain" | "arbitrum-sepolia" | "base-sepolia";
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// --- Workflow ---

const onHttpTrigger = async (runtime: Runtime<Config>, payload: { input: Uint8Array }) => {
  const inputStr = new TextDecoder().decode(payload.input);
  const request: DeployRequest = JSON.parse(inputStr);

  runtime.log(`Deploy token: ${request.name} (${request.symbol}) on ${request.targetChain}`);

  // Select chain + contract
  let chainSelector: string;
  let factoryAddress: string;

  switch (request.targetChain) {
    case "world-chain":
      chainSelector = WORLD_CHAIN;
      factoryAddress = runtime.config.tokenFactoryWorldChain;
      break;
    case "arbitrum-sepolia":
      chainSelector = ARB_SEPOLIA;
      factoryAddress = runtime.config.tokenFactoryArbSepolia;
      break;
    case "base-sepolia":
      chainSelector = BASE_SEPOLIA;
      factoryAddress = runtime.config.tokenFactoryBaseSepolia;
      break;
    default:
      throw new Error(`INVALID_CHAIN: ${request.targetChain}`);
  }

  const client = new EVMClient(chainSelector);

  // Prepare deployToken call
  const deployCalldata = encodeFunctionData({
    abi: TokenFactoryAbi,
    functionName: "deployToken",
    args: [
      request.name,
      request.symbol,
      BigInt(request.initialSupply),
      request.decimals,
      request.creator as Address,
      request.enableMinting,
    ],
  });

  runtime.log(`Deploying via factory at ${factoryAddress}`);

  const report = runtime.report(prepareReportRequest(deployCalldata)).result();

  const writeResult = client.writeReport(runtime, {
    receiver: factoryAddress,
    report: report,
    gasConfig: { gasLimit: "1000000" }, // Token deployment can be gas-intensive
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    throw new Error(`TOKEN_DEPLOY_FAILED: ${writeResult.txStatus}`);
  }

  runtime.log(`Deploy tx status: ${writeResult.txStatus}`);

  // Extract token address from logs (deployToken returns address)
  // For simplicity, return tx hash — frontend can parse logs
  const txHash = writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x";

  return {
    success: true,
    chain: request.targetChain,
    txHash,
    message: "Token deployed — parse logs for address",
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
