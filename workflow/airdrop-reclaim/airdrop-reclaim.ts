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
import { HumanDropAbi } from "./abi";

// --- Types ---

type Config = {
  humanDropWorldChain: string;
  humanDropArbSepolia: string;
  humanDropBaseSepolia: string;
  schedule: string; // Cron schedule
};

interface Airdrop {
  token: Address;
  amountOrb: bigint;
  amountDevice: bigint;
  totalClaimed: bigint;
  maxClaims: bigint;
  expiry: bigint;
  creator: Address;
  active: boolean;
}

// --- Chain Selectors ---

const WORLD_CHAIN = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
const BASE_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// --- Helpers ---

const getAirdropCount = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string): bigint => {
  const calldata = encodeFunctionData({
    abi: HumanDropAbi,
    functionName: "nextAirdropId",
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
    abi: HumanDropAbi,
    functionName: "nextAirdropId",
    data: hex,
  });

  return count;
};

const getAirdrop = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string, airdropId: bigint): Airdrop => {
  const calldata = encodeFunctionData({
    abi: HumanDropAbi,
    functionName: "getAirdrop",
    args: [airdropId],
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
  const [airdrop] = decodeFunctionResult({
    abi: HumanDropAbi,
    functionName: "getAirdrop",
    data: hex,
  });

  return airdrop as Airdrop;
};

const reclaimAirdrop = (runtime: Runtime<Config>, client: EVMClient, contractAddr: string, airdropId: bigint): boolean => {
  const calldata = encodeFunctionData({
    abi: HumanDropAbi,
    functionName: "withdraw",
    args: [airdropId],
  });

  const report = runtime.report(prepareReportRequest(calldata)).result();

  const writeResult = client.writeReport(runtime, {
    receiver: contractAddr,
    report: report,
    gasConfig: { gasLimit: "300000" },
  }).result();

  if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
    runtime.log(`RECLAIM_FAILED: airdropId=${airdropId}, status=${writeResult.txStatus}`);
    return false;
  }

  runtime.log(`Reclaimed airdropId=${airdropId}, txHash=${writeResult.txHash ? bytesToHex(writeResult.txHash) : "0x"}`);
  return true;
};

const processChain = (runtime: Runtime<Config>, chainName: string, chainSelector: string, contractAddr: string): number => {
  runtime.log(`Processing ${chainName} at ${contractAddr}`);

  const client = new EVMClient(chainSelector);
  const now = BigInt(Math.floor(Date.now() / 1000));

  let reclaimedCount = 0;

  try {
    const airdropCount = getAirdropCount(runtime, client, contractAddr);
    runtime.log(`${chainName}: ${airdropCount} airdrops total`);

    for (let i = 0n; i < airdropCount; i++) {
      const airdrop = getAirdrop(runtime, client, contractAddr, i);

      // Check if expired and has unclaimed tokens
      if (airdrop.expiry < now && airdrop.totalClaimed < airdrop.maxClaims) {
        runtime.log(`${chainName}: airdropId=${i} expired, reclaiming`);
        if (reclaimAirdrop(runtime, client, contractAddr, i)) {
          reclaimedCount++;
        }
      }
    }
  } catch (err) {
    runtime.log(`${chainName} error: ${err}`);
  }

  return reclaimedCount;
};

// --- Workflow ---

const onCronTrigger = async (runtime: Runtime<Config>, _payload: unknown) => {
  runtime.log("Cron: airdrop-reclaim triggered");

  let totalReclaimed = 0;

  // Process World Chain
  totalReclaimed += processChain(
    runtime,
    "World Chain",
    WORLD_CHAIN,
    runtime.config.humanDropWorldChain
  );

  // Process Arbitrum Sepolia
  totalReclaimed += processChain(
    runtime,
    "Arbitrum Sepolia",
    ARB_SEPOLIA,
    runtime.config.humanDropArbSepolia
  );

  // Process Base Sepolia
  totalReclaimed += processChain(
    runtime,
    "Base Sepolia",
    BASE_SEPOLIA,
    runtime.config.humanDropBaseSepolia
  );

  runtime.log(`Total reclaimed: ${totalReclaimed}`);

  return {
    success: true,
    reclaimed: totalReclaimed,
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
