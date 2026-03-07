import {
  CronCapability,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  encodeCallMsg,
  prepareReportRequest,
  bytesToHex,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, type Hex, type Address } from "viem";
import { HumanDropAbi, FairLaunchAbi } from "./abi";

// --- Types ---

type Config = {
  humanDropWorldChain: string;
  humanDropArbSepolia: string;
  humanDropBaseSepolia: string;
  fairLaunchWorldChain: string;
  fairLaunchArbSepolia: string;
  fairLaunchBaseSepolia: string;
  mannaIndexWorldChain: string;
  schedule: string;
};

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// --- ABI ---

const mannaIndexAbi = [{
  name: "updateStats",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "uint256", name: "totalAirdrops" },
    { type: "uint256", name: "totalLaunches" },
    { type: "uint256", name: "totalUsers" },
    { type: "uint256", name: "totalVolume" }
  ],
  outputs: []
}] as const;

// --- Helpers ---

const readCount = (
  runtime: Runtime<Config>,
  client: EVMClient,
  contractAddr: string,
  abi: any,
  functionName: string
): bigint => {
  const calldata = encodeFunctionData({
    abi,
    functionName,
  });

  const result = client.callContract(runtime, {
    call: encodeCallMsg({
      from: ZERO_ADDR,
      to: contractAddr as Address,
      data: calldata,
    }),
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  const hex = bytesToHex(result.data) as Hex;
  const [count] = decodeFunctionResult({
    abi,
    functionName,
    data: hex,
  });

  return count;
};

// --- Workflow ---

const onCronTrigger = async (runtime: Runtime<Config>, _payload: unknown) => {
  runtime.log("Cron: stats-sync triggered");

  let totalAirdrops = 0n;
  let totalLaunches = 0n;

  const chains = [
    { name: "World Chain", selector: WORLD_CHAIN, humanDrop: runtime.config.humanDropWorldChain, fairLaunch: runtime.config.fairLaunchWorldChain },
    { name: "Arbitrum Sepolia", selector: ARB_SEPOLIA, humanDrop: runtime.config.humanDropArbSepolia, fairLaunch: runtime.config.fairLaunchArbSepolia },
    { name: "Base Sepolia", selector: BASE_SEPOLIA, humanDrop: runtime.config.humanDropBaseSepolia, fairLaunch: runtime.config.fairLaunchBaseSepolia },
  ];

  // Aggregate stats from all chains
  for (const chain of chains) {
    try {
      const client = new EVMClient(chain.selector);

      const airdropCount = readCount(runtime, client, chain.humanDrop, HumanDropAbi, "nextAirdropId");
      const launchCount = readCount(runtime, client, chain.fairLaunch, FairLaunchAbi, "nextLaunchId");

      runtime.log(`${chain.name}: ${airdropCount} airdrops, ${launchCount} launches`);

      totalAirdrops += airdropCount;
      totalLaunches += launchCount;
    } catch (err) {
      runtime.log(`${chain.name} error: ${err}`);
    }
  }

  runtime.log(`Total: ${totalAirdrops} airdrops, ${totalLaunches} launches`);

  // Write to MannaIndex on World Chain
  const worldChainClient = new EVMClient(WORLD_CHAIN);

  const updateCalldata = encodeFunctionData({
    abi: mannaIndexAbi,
    functionName: "updateStats",
    args: [
      totalAirdrops,
      totalLaunches,
      0n, // totalUsers - placeholder for now
      0n, // totalVolume - placeholder for now
    ],
  });

  const report = runtime.report(prepareReportRequest(updateCalldata)).result();

  const writeResult = worldChainClient.writeReport(runtime, {
    receiver: runtime.config.mannaIndexWorldChain,
    report: report,
    gasConfig: { gasLimit: "300000" },
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    runtime.log(`STATS_UPDATE_FAILED: ${writeResult.txStatus}`);
    return {
      success: false,
      error: `Update failed: ${writeResult.txStatus}`,
    };
  }

  runtime.log(`Stats updated, txHash: ${writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x"}`);

  return {
    success: true,
    totalAirdrops: totalAirdrops.toString(),
    totalLaunches: totalLaunches.toString(),
    txHash: writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x",
  };
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
