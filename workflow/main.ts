import {
  HTTPCapability,
  ConfidentialHTTPClient,
  EVMClient,
  handler,
  Runner,
  type Runtime,
  encodeCallMsg,
  prepareReportRequest,
  ok,
  json,
  bytesToHex,
  LATEST_BLOCK_NUMBER,
} from "@chainlink/cre-sdk";
import { encodeFunctionData, decodeFunctionResult, type Hex, type Address } from "viem";

// --- Types ---

type Config = {
  worldIdAppId: string;
  humanDropAddress: string;
  worldIdVerifierAddress: string;
};

interface ClaimRequest {
  airdropId: number;
  proof: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: string;
  };
  signal: string;
  action: string;
}

// --- ABI fragments ---

const hasClaimedAbi = [{
  name: "hasClaimed",
  type: "function",
  stateMutability: "view",
  inputs: [{ type: "uint256", name: "airdropId" }, { type: "uint256", name: "nullifierHash" }],
  outputs: [{ type: "bool" }],
}] as const;

const claimAbi = [{
  name: "claim",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "uint256", name: "airdropId" },
    { type: "uint256", name: "nullifierHash" },
    { type: "address", name: "receiver" },
    { type: "uint8", name: "verificationLevel" },
  ],
  outputs: [],
}] as const;

const registerHumanAbi = [{
  name: "registerHuman",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { type: "uint256", name: "nullifierHash" },
    { type: "uint8", name: "verificationLevel" },
  ],
  outputs: [],
}] as const;

// --- Workflow ---

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;
const ARB_SEPOLIA = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];

const confidentialHttp = new ConfidentialHTTPClient();

const onHttpTrigger = async (runtime: Runtime<Config>, payload: { input: Uint8Array }) => {
  const inputStr = new TextDecoder().decode(payload.input);
  const request: ClaimRequest = JSON.parse(inputStr);

  runtime.log(`Claim: airdrop=${request.airdropId} nullifier=${request.proof.nullifier_hash}`);

  // Step 1: Verify World ID proof via Cloud API (confidential)
  const verifyResp = confidentialHttp.sendRequest(runtime, {
    vaultDonSecrets: [{ key: "WORLD_ID_API_KEY", namespace: "humandrop" }],
    request: {
      url: `https://developer.worldcoin.org/api/v2/verify/${runtime.config.worldIdAppId}`,
      method: "POST",
      multiHeaders: {
        "Content-Type": { values: ["application/json"] },
      },
      bodyString: JSON.stringify({
        merkle_root: request.proof.merkle_root,
        nullifier_hash: request.proof.nullifier_hash,
        proof: request.proof.proof,
        verification_level: request.proof.verification_level,
        signal_hash: request.signal,
        action: request.action,
      }),
    },
  }).result();

  if (!ok(verifyResp)) {
    throw new Error(`World ID verify failed: ${verifyResp.statusCode}`);
  }

  const verifyData = json(verifyResp) as { success: boolean };
  if (!verifyData.success) {
    throw new Error("World ID proof verification failed");
  }
  runtime.log("World ID proof verified");

  // Step 2: Check double-claim on-chain
  const arbSepolia = new EVMClient(ARB_SEPOLIA);

  const hasClaimedData = encodeFunctionData({
    abi: hasClaimedAbi,
    functionName: "hasClaimed",
    args: [BigInt(request.airdropId), BigInt(request.proof.nullifier_hash)],
  });

  const readResult = arbSepolia.callContract(runtime, {
    call: encodeCallMsg({
      from: ZERO_ADDR,
      to: runtime.config.humanDropAddress as Address,
      data: hasClaimedData,
    }),
    blockNumber: LATEST_BLOCK_NUMBER,
  }).result();

  const readHex = bytesToHex(readResult.data) as Hex;
  const [alreadyClaimed] = decodeFunctionResult({
    abi: hasClaimedAbi,
    functionName: "hasClaimed",
    data: readHex,
  });

  if (alreadyClaimed) {
    throw new Error("Already claimed this airdrop");
  }
  runtime.log("Not yet claimed — proceeding");

  // Step 3: Write claim to HumanDrop
  const verificationLevel = request.proof.verification_level === "orb" ? 2 : 1;

  const claimCalldata = encodeFunctionData({
    abi: claimAbi,
    functionName: "claim",
    args: [
      BigInt(request.airdropId),
      BigInt(request.proof.nullifier_hash),
      request.signal as Address,
      verificationLevel,
    ],
  });

  const claimReport = runtime.report(prepareReportRequest(claimCalldata)).result();

  const claimWrite = arbSepolia.writeReport(runtime, {
    receiver: runtime.config.humanDropAddress,
    report: claimReport,
    gasConfig: { gasLimit: "500000" },
  }).result();

  runtime.log(`Claim tx status: ${claimWrite.txStatus}`);

  // Step 4: Register human on WorldIDVerifier
  const registerCalldata = encodeFunctionData({
    abi: registerHumanAbi,
    functionName: "registerHuman",
    args: [BigInt(request.proof.nullifier_hash), verificationLevel],
  });

  const registerReport = runtime.report(prepareReportRequest(registerCalldata)).result();

  arbSepolia.writeReport(runtime, {
    receiver: runtime.config.worldIdVerifierAddress,
    report: registerReport,
    gasConfig: { gasLimit: "200000" },
  }).result();

  runtime.log("Human registered on WorldIDVerifier");

  return {
    success: true,
    airdropId: request.airdropId,
    nullifierHash: request.proof.nullifier_hash,
    txHash: claimWrite.txHash ? bytesToHex(claimWrite.txHash) : "0x",
  };
};

const initWorkflow = (config: Config) => {
  const http = new HTTPCapability();

  return [
    handler(
      http.trigger({ authorizedKeys: [] }),
      onHttpTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
