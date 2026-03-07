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
import { HumanDropAbi } from "./abi";

// --- Types ---

type Config = {
  humanDropWorldChain: string;
  humanDropArbSepolia: string;
  humanDropBaseSepolia: string;
  authorizedEVMAddress: string; // For HTTP trigger auth
};

interface CreateAirdropRequest {
  creator: string;
  token: string;
  amountOrb: string;
  amountDevice: string;
  maxClaims: string;
  expiry: string;
  targetChain: "world-chain" | "arbitrum-sepolia" | "base-sepolia";
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

// --- Workflow ---

const onHttpTrigger = async (runtime: Runtime<Config>, payload: { input: Uint8Array }) => {
  const inputStr = new TextDecoder().decode(payload.input);
  const request: CreateAirdropRequest = JSON.parse(inputStr);

  runtime.log(`Create airdrop: token=${request.token} on ${request.targetChain}`);

  // Select chain + contract
  let chainSelector: string;
  let humanDropAddress: string;

  switch (request.targetChain) {
    case "world-chain":
      chainSelector = WORLD_CHAIN;
      humanDropAddress = runtime.config.humanDropWorldChain;
      break;
    case "arbitrum-sepolia":
      chainSelector = ARB_SEPOLIA;
      humanDropAddress = runtime.config.humanDropArbSepolia;
      break;
    case "base-sepolia":
      chainSelector = BASE_SEPOLIA;
      humanDropAddress = runtime.config.humanDropBaseSepolia;
      break;
    default:
      throw new Error(`INVALID_CHAIN: ${request.targetChain}`);
  }

  const client = new EVMClient(chainSelector);

  // Prepare createAirdrop call
  const createCalldata = encodeFunctionData({
    abi: HumanDropAbi,
    functionName: "createAirdrop",
    args: [
      request.token as Address,
      BigInt(request.amountOrb),
      BigInt(request.amountDevice),
      BigInt(request.maxClaims),
      BigInt(request.expiry),
    ],
  });

  runtime.log(`Creating airdrop via HumanDrop at ${humanDropAddress}`);

  const report = runtime.report(prepareReportRequest(createCalldata)).result();

  const writeResult = client.writeReport(runtime, {
    receiver: humanDropAddress,
    report: report,
    gasConfig: { gasLimit: "500000" },
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    throw new Error(`AIRDROP_CREATE_FAILED: ${writeResult.txStatus}`);
  }

  runtime.log(`Airdrop created, tx status: ${writeResult.txStatus}`);

  // Return tx hash — frontend can parse logs for airdropId
  const txHash = writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x";

  return {
    success: true,
    chain: request.targetChain,
    txHash,
    message: "Airdrop created — parse logs for airdropId",
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
