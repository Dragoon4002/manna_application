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
import { FairLaunchAbi } from "./abi";

// --- Types ---

type Config = {
  fairLaunchWorldChain: string;
  fairLaunchArbSepolia: string;
  fairLaunchBaseSepolia: string;
  schedule: string; // Cron schedule
};

interface Launch {
  token: Address;
  creator: Address;
  totalTokens: bigint;
  tokensSold: bigint;
  hardCap: bigint;
  softCap: bigint;
  raised: bigint;
  startTime: bigint;
  endTime: bigint;
  maxPerWallet: bigint;
  startPrice: bigint;
  endPrice: bigint;
  finalized: boolean;
  success: boolean;
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// --- Helpers ---

const getLaunchCount = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string): bigint => {
  const calldata = encodeFunctionData({
    abi: FairLaunchAbi,
    functionName: "launchCount",
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
    abi: FairLaunchAbi,
    functionName: "launchCount",
    data: hex,
  });

  return count;
};

const getLaunch = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string, launchId: bigint): Launch => {
  const calldata = encodeFunctionData({
    abi: FairLaunchAbi,
    functionName: "getLaunch",
    args: [launchId],
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
  const [launch] = decodeFunctionResult({
    abi: FairLaunchAbi,
    functionName: "getLaunch",
    data: hex,
  });

  return launch as Launch;
};

const finalizeLaunch = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string, launchId: bigint) => {
  const calldata = encodeFunctionData({
    abi: FairLaunchAbi,
    functionName: "finalize",
    args: [launchId],
  });

  const report = runtime.report(prepareReportRequest(calldata)).result();

  const writeResult = client.writeReport(runtime, {
    receiver: contractAddr,
    report: report,
    gasConfig: { gasLimit: "500000" },
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    runtime.log(`FINALIZE_FAILED: launchId=${launchId}, status=${writeResult.txStatus}`);
    return false;
  }

  runtime.log(`Finalized launchId=${launchId}, txHash=${writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x"}`);
  return true;
};

const processChain = (runtime: Runtime<Config>, chainName: string, chainSelector: string, contractAddr: string): number => {
  runtime.log(`Processing ${chainName} at ${contractAddr}`);

  const client = new EVMClient(chainSelector);
  const now = BigInt(Math.floor(Date.now() / 1000));

  let finalizedCount = 0;

  try {
    const launchCount = getLaunchCount(runtime, client, contractAddr);
    runtime.log(`${chainName}: ${launchCount} launches total`);

    for (let i = 0n; i < launchCount; i++) {
      const launch = getLaunch(runtime, client, contractAddr, i);

      if (!launch.finalized && launch.endTime < now) {
        runtime.log(`${chainName}: launchId=${i} ended, finalizing`);
        if (finalizeLaunch(runtime, client, contractAddr, i)) {
          finalizedCount++;
        }
      }
    }
  } catch (err) {
    runtime.log(`${chainName} error: ${err}`);
  }

  return finalizedCount;
};

// --- Workflow ---

const onCronTrigger = async (runtime: Runtime<Config>, _payload: unknown) => {
  runtime.log("Cron: fair-launch-finalize triggered");

  let totalFinalized = 0;

  // Process World Chain
  totalFinalized += processChain(
    runtime,
    "World Chain",
    WORLD_CHAIN,
    runtime.config.fairLaunchWorldChain
  );

  // Process Arbitrum Sepolia
  totalFinalized += processChain(
    runtime,
    "Arbitrum Sepolia",
    ARB_SEPOLIA,
    runtime.config.fairLaunchArbSepolia
  );

  // Process Base Sepolia
  totalFinalized += processChain(
    runtime,
    "Base Sepolia",
    BASE_SEPOLIA,
    runtime.config.fairLaunchBaseSepolia
  );

  runtime.log(`Total finalized: ${totalFinalized}`);

  return {
    success: true,
    finalized: totalFinalized,
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
