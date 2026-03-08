/**
 * CRE Workflow Simulator — Manna Protocol
 *
 * Simulates all 8 CRE workflows locally using viem against Tenderly VNet.
 * Replicates exactly what the CRE DON would do: read state, write txs, log results.
 *
 * Usage: bun run workflow/simulate.ts
 * Reads CREATOR_PRIVATE_KEY + RPC from manna_app/.env.local
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  formatUnits,
  keccak256,
  toBytes,
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load env from manna_app/.env.local ──────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dir, "../manna_app/.env.local");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    // strip inline comments
    const commentIdx = val.indexOf(" #");
    if (commentIdx !== -1) val = val.slice(0, commentIdx).trim();
    env[key] = val;
  }
  return env;
}

const env = loadEnv();

const RPC_URL = env.ARBITRUM_SEPOLIA_RPC;
const PRIVATE_KEY = env.CREATOR_PRIVATE_KEY as Hex;
const HUMANDROP = env.NEXT_PUBLIC_HUMANDROP_ADDRESS as Address;
const VERIFIER = env.NEXT_PUBLIC_WORLD_ID_VERIFIER_ADDRESS as Address;
const HDT = env.NEXT_PUBLIC_HDT_ADDRESS as Address;
const FAIR_LAUNCH = env.NEXT_PUBLIC_FAIR_LAUNCH_ADDRESS as Address;
const TOKEN_FACTORY = env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as Address;
const MANNA_INDEX = env.NEXT_PUBLIC_MANNA_INDEX_ADDRESS as Address;

const account = privateKeyToAccount(PRIVATE_KEY);
const WALLET = account.address;

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account,
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

// ── ABIs ────────────────────────────────────────────────────────────────

const erc20Abi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address", name: "account" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address", name: "spender" }, { type: "uint256", name: "amount" }], outputs: [{ type: "bool" }] },
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const tokenFactoryAbi = [
  {
    name: "deployToken", type: "function", stateMutability: "nonpayable",
    inputs: [
      { type: "string", name: "name" }, { type: "string", name: "symbol" },
      { type: "uint256", name: "initialSupply" }, { type: "uint8", name: "decimals_" },
      { type: "address", name: "owner" }, { type: "bool", name: "enableMinting" },
    ],
    outputs: [{ type: "address", name: "token" }],
  },
  {
    name: "TokenDeployed", type: "event",
    inputs: [
      { type: "address", name: "token", indexed: true },
      { type: "address", name: "creator", indexed: true },
      { type: "string", name: "name" }, { type: "string", name: "symbol" },
      { type: "uint256", name: "initialSupply" }, { type: "uint8", name: "decimals" },
    ],
  },
] as const;

const humanDropAbi = [
  {
    name: "createAirdrop", type: "function", stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "token" }, { type: "uint256", name: "amountOrb" },
      { type: "uint256", name: "amountDevice" }, { type: "uint256", name: "maxClaims" },
      { type: "uint256", name: "expiry" },
    ],
    outputs: [{ type: "uint256", name: "airdropId" }],
  },
  {
    name: "claim", type: "function", stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "airdropId" }, { type: "uint256", name: "nullifierHash" },
      { type: "address", name: "receiver" }, { type: "uint8", name: "verificationLevel" },
    ],
    outputs: [],
  },
  { name: "isEligible", type: "function", stateMutability: "view", inputs: [{ type: "uint256", name: "airdropId" }, { type: "uint256", name: "nullifierHash" }], outputs: [{ type: "bool" }] },
  { name: "hasClaimed", type: "function", stateMutability: "view", inputs: [{ type: "uint256", name: "airdropId" }, { type: "uint256", name: "nullifierHash" }], outputs: [{ type: "bool" }] },
  { name: "nextAirdropId", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getAirdrop", type: "function", stateMutability: "view",
    inputs: [{ type: "uint256", name: "airdropId" }],
    outputs: [{
      type: "tuple", components: [
        { type: "address", name: "token" }, { type: "uint256", name: "amountOrb" },
        { type: "uint256", name: "amountDevice" }, { type: "uint256", name: "totalClaimed" },
        { type: "uint256", name: "maxClaims" }, { type: "uint256", name: "expiry" },
        { type: "address", name: "creator" }, { type: "bool", name: "active" },
      ],
    }],
  },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [{ type: "uint256", name: "airdropId" }], outputs: [] },
  {
    name: "AirdropCreated", type: "event",
    inputs: [
      { type: "uint256", name: "airdropId", indexed: true },
      { type: "address", name: "token", indexed: true },
      { type: "address", name: "creator", indexed: true },
      { type: "uint256", name: "expiry" },
    ],
  },
  {
    name: "Claimed", type: "event",
    inputs: [
      { type: "uint256", name: "airdropId", indexed: true },
      { type: "uint256", name: "nullifierHash", indexed: true },
      { type: "address", name: "receiver" },
      { type: "uint256", name: "amount" },
      { type: "uint8", name: "level" },
    ],
  },
] as const;

const worldIdVerifierAbi = [
  {
    name: "registerHuman", type: "function", stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "nullifierHash" }, { type: "uint8", name: "verificationLevel" }],
    outputs: [],
  },
  { name: "isVerifiedHuman", type: "function", stateMutability: "view", inputs: [{ type: "uint256", name: "nullifierHash" }], outputs: [{ type: "bool" }] },
] as const;

const fairLaunchAbi = [
  {
    name: "createLaunch", type: "function", stateMutability: "nonpayable",
    inputs: [
      { type: "address", name: "token" }, { type: "uint256", name: "totalTokens" },
      { type: "uint256", name: "hardCap" }, { type: "uint256", name: "softCap" },
      { type: "uint256", name: "duration" }, { type: "uint256", name: "maxPerWallet" },
      { type: "uint256", name: "startPrice" }, { type: "uint256", name: "endPrice" },
    ],
    outputs: [{ type: "uint256", name: "launchId" }],
  },
  { name: "contribute", type: "function", stateMutability: "payable", inputs: [{ type: "uint256", name: "launchId" }], outputs: [] },
  { name: "finalize", type: "function", stateMutability: "nonpayable", inputs: [{ type: "uint256", name: "launchId" }], outputs: [] },
  { name: "nextLaunchId", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    name: "getLaunch", type: "function", stateMutability: "view",
    inputs: [{ type: "uint256", name: "launchId" }],
    outputs: [{
      type: "tuple", components: [
        { type: "address", name: "token" }, { type: "address", name: "creator" },
        { type: "uint256", name: "totalTokens" }, { type: "uint256", name: "tokensSold" },
        { type: "uint256", name: "hardCap" }, { type: "uint256", name: "softCap" },
        { type: "uint256", name: "raised" }, { type: "uint256", name: "startTime" },
        { type: "uint256", name: "endTime" }, { type: "uint256", name: "maxPerWallet" },
        { type: "uint256", name: "startPrice" }, { type: "uint256", name: "endPrice" },
        { type: "bool", name: "finalized" }, { type: "bool", name: "success" },
      ],
    }],
  },
  {
    name: "LaunchCreated", type: "event",
    inputs: [
      { type: "uint256", name: "launchId", indexed: true },
      { type: "address", name: "token", indexed: true },
      { type: "address", name: "creator", indexed: true },
      { type: "uint256", name: "totalTokens" },
      { type: "uint256", name: "startPrice" }, { type: "uint256", name: "endPrice" },
      { type: "uint256", name: "endTime" },
    ],
  },
] as const;

const mannaIndexAbi = [
  {
    name: "updateStats", type: "function", stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "totalAirdrops" }, { type: "uint256", name: "totalLaunches" },
      { type: "uint256", name: "totalUsers" }, { type: "uint256", name: "totalVolume" },
    ],
    outputs: [],
  },
  {
    name: "getStats", type: "function", stateMutability: "view", inputs: [],
    outputs: [{
      type: "tuple", components: [
        { type: "uint256", name: "totalAirdrops" }, { type: "uint256", name: "totalLaunches" },
        { type: "uint256", name: "totalUsers" }, { type: "uint256", name: "totalVolume" },
        { type: "uint256", name: "lastUpdate" },
      ],
    }],
  },
] as const;

// ── Helpers ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Result = { workflow: string; status: "SUCCESS" | "FAIL" | "SKIP"; detail: string; tx?: string };
const results: Result[] = [];

function header(n: number, name: string, file: string) {
  console.log(`\n[${n}/8] ${name} ${"─".repeat(50 - name.length)}`);
  console.log(`  Simulating: ${file}`);
}

function success(workflow: string, detail: string, tx?: string) {
  console.log(`  Result: ${detail}`);
  if (tx) console.log(`  Tx: ${tx}`);
  console.log("  Status: \x1b[32mSUCCESS\x1b[0m");
  results.push({ workflow, status: "SUCCESS", detail, tx });
}

function fail(workflow: string, detail: string) {
  console.log(`  Result: ${detail}`);
  console.log("  Status: \x1b[31mFAIL\x1b[0m");
  results.push({ workflow, status: "FAIL", detail });
}

async function writeTx(hash: Hex): Promise<void> {
  await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
}

// ── State shared across phases ──────────────────────────────────────────

let simTokenAddress: Address;
let newAirdropId: bigint;
let newLaunchId: bigint;

// ── Phase 1: TOKEN-DEPLOY ───────────────────────────────────────────────

async function phase1_tokenDeploy() {
  header(1, "TOKEN-DEPLOY", "workflow/token-deploy/token-deploy.ts");
  console.log("  Action: TokenFactory.deployToken(\"SimToken\", \"SIM\", 1000000e18, 18, wallet, true)");

  const hash = await walletClient.writeContract({
    address: TOKEN_FACTORY,
    abi: tokenFactoryAbi,
    functionName: "deployToken",
    args: ["SimToken", "SIM", parseEther("1000000"), 18, WALLET, true],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse TokenDeployed event
  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({ abi: tokenFactoryAbi, data: log.data, topics: log.topics });
      if (event.eventName === "TokenDeployed") {
        simTokenAddress = event.args.token;
        break;
      }
    } catch { /* skip non-matching logs */ }
  }

  if (!simTokenAddress) throw new Error("TokenDeployed event not found");
  success("TOKEN-DEPLOY", `deployed SIM at ${simTokenAddress}`, hash);
}

// ── Phase 2: TOKEN-MINT ─────────────────────────────────────────────────

async function phase2_tokenMint() {
  header(2, "TOKEN-MINT", "workflow/token-mint/token-mint.ts");
  console.log(`  Action: SIM.mint(wallet, 500000e18)`);

  const hash = await walletClient.writeContract({
    address: simTokenAddress,
    abi: erc20Abi,
    functionName: "mint",
    args: [WALLET, parseEther("500000")],
  });
  await writeTx(hash);

  const bal = await publicClient.readContract({
    address: simTokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [WALLET],
  }) as bigint;

  success("TOKEN-MINT", `minted 500k SIM, balance=${formatEther(bal)} SIM`, hash);
}

// ── Phase 3: AIRDROP-CREATE ─────────────────────────────────────────────

async function phase3_airdropCreate() {
  header(3, "AIRDROP-CREATE", "workflow/airdrop-create/airdrop-create.ts");

  // Transfer tokens to HumanDrop to fund the airdrop
  const fundAmount = parseEther("10000"); // 100 orb * 100 claims max
  console.log(`  Action: SIM.approve + HumanDrop.createAirdrop(SIM, 100e18, 50e18, 100, now+1hr)`);

  // Transfer tokens to HumanDrop first (contract pulls from its own balance)
  const transferHash = await walletClient.writeContract({
    address: simTokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [HUMANDROP, fundAmount],
  });
  await writeTx(transferHash);

  // Actually transfer tokens to HumanDrop so it has balance for claims
  const xferHash = await walletClient.writeContract({
    address: simTokenAddress,
    abi: [{ name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [{ type: "bool" }] }] as const,
    functionName: "transfer",
    args: [HUMANDROP, fundAmount],
  });
  await writeTx(xferHash);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const expiry = now + BigInt(3600); // 1 hour from now

  const hash = await walletClient.writeContract({
    address: HUMANDROP,
    abi: humanDropAbi,
    functionName: "createAirdrop",
    args: [simTokenAddress, parseEther("100"), parseEther("50"), BigInt(100), expiry],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  for (const log of receipt.logs) {
    try {
      const event = decodeEventLog({ abi: humanDropAbi, data: log.data, topics: log.topics });
      if (event.eventName === "AirdropCreated") {
        newAirdropId = event.args.airdropId;
        break;
      }
    } catch { /* skip */ }
  }

  success("AIRDROP-CREATE", `airdrop #${newAirdropId} created (SIM, 100/50 per claim, 100 max, 1hr expiry)`, hash);
}

// ── Phase 4: CLAIM ──────────────────────────────────────────────────────

async function phase4_claim() {
  header(4, "CLAIM", "workflow/claim/main.ts");

  // Generate fake nullifier (in real CRE, this comes from World ID ZK proof)
  const fakeNullifier = BigInt(keccak256(toBytes(`sim-nullifier-${WALLET}-${newAirdropId}`)));
  console.log("  Action: [skip World ID verify] -> isEligible check -> HumanDrop.claim + WorldIDVerifier.registerHuman");
  console.log(`  Note: World ID proof verification skipped (no ConfidentialHTTPClient locally)`);

  // Step 1: Check eligibility (CRE would do this)
  const eligible = await publicClient.readContract({
    address: HUMANDROP, abi: humanDropAbi, functionName: "isEligible",
    args: [newAirdropId, fakeNullifier],
  }) as boolean;
  console.log(`  Eligible: ${eligible}`);

  if (!eligible) { fail("CLAIM", "not eligible"); return; }

  // Step 2: Check double-claim (CRE does hasClaimed check)
  const alreadyClaimed = await publicClient.readContract({
    address: HUMANDROP, abi: humanDropAbi, functionName: "hasClaimed",
    args: [newAirdropId, fakeNullifier],
  }) as boolean;

  if (alreadyClaimed) { fail("CLAIM", "already claimed"); return; }

  // Step 3: Claim (CRE writes via consensus report)
  const claimHash = await walletClient.writeContract({
    address: HUMANDROP, abi: humanDropAbi, functionName: "claim",
    args: [newAirdropId, fakeNullifier, WALLET, 2], // level 2 = Orb
  });
  await writeTx(claimHash);

  // Step 4: Register human on WorldIDVerifier (CRE writes this too)
  let regHash: Hex | undefined;
  try {
    regHash = await walletClient.writeContract({
      address: VERIFIER, abi: worldIdVerifierAbi, functionName: "registerHuman",
      args: [fakeNullifier, 2],
    });
    await writeTx(regHash);
  } catch {
    console.log("  Note: registerHuman skipped (may already be registered)");
  }

  // Verify
  const isHuman = await publicClient.readContract({
    address: VERIFIER, abi: worldIdVerifierAbi, functionName: "isVerifiedHuman",
    args: [fakeNullifier],
  }) as boolean;

  success("CLAIM", `claimed airdrop #${newAirdropId} (Orb level), human registered=${isHuman}`, claimHash);
}

// ── Phase 5: FAIR-LAUNCH (full flow) ────────────────────────────────────

async function phase5_fairLaunch() {
  header(5, "FAIR-LAUNCH-FINALIZE", "workflow/fair-launch-finalize/fair-launch-finalize.ts");
  console.log("  Action: createLaunch(SIM, 10000e18, 1 ETH hardCap, 0 softCap, 5s, ...) -> contribute -> finalize");

  const launchTokens = parseEther("10000");
  const duration = BigInt(5); // 5 seconds

  // Approve FairLaunch to pull tokens
  const approveHash = await walletClient.writeContract({
    address: simTokenAddress, abi: erc20Abi, functionName: "approve",
    args: [FAIR_LAUNCH, launchTokens],
  });
  await writeTx(approveHash);

  // Create launch: softCap=0 (always succeeds), hardCap=1 ETH, 5s duration
  const createHash = await walletClient.writeContract({
    address: FAIR_LAUNCH, abi: fairLaunchAbi, functionName: "createLaunch",
    args: [
      simTokenAddress,
      launchTokens,
      parseEther("1"),      // hardCap
      BigInt(0),             // softCap (0 = always succeeds)
      duration,              // 5 seconds
      parseEther("1"),       // maxPerWallet
      parseEther("0.001"),   // startPrice
      parseEther("0.002"),   // endPrice
    ],
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

  for (const log of createReceipt.logs) {
    try {
      const event = decodeEventLog({ abi: fairLaunchAbi, data: log.data, topics: log.topics });
      if (event.eventName === "LaunchCreated") {
        newLaunchId = event.args.launchId;
        break;
      }
    } catch { /* skip */ }
  }
  console.log(`  Launch #${newLaunchId} created, waiting for expiry...`);

  // Contribute 0.01 ETH
  const contributeHash = await walletClient.writeContract({
    address: FAIR_LAUNCH, abi: fairLaunchAbi, functionName: "contribute",
    args: [newLaunchId],
    value: parseEther("0.01"),
  });
  await writeTx(contributeHash);
  console.log("  Contributed 0.01 ETH");

  // Wait for launch to end
  await sleep(8000);

  // Finalize (CRE cron workflow does this)
  const finalizeHash = await walletClient.writeContract({
    address: FAIR_LAUNCH, abi: fairLaunchAbi, functionName: "finalize",
    args: [newLaunchId],
  });
  await writeTx(finalizeHash);

  // Verify
  const launch = await publicClient.readContract({
    address: FAIR_LAUNCH, abi: fairLaunchAbi, functionName: "getLaunch", args: [newLaunchId],
  }) as { finalized: boolean; success: boolean; raised: bigint };

  success(
    "FAIR-LAUNCH-FINALIZE",
    `launch #${newLaunchId} finalized=${launch.finalized}, success=${launch.success}, raised=${formatEther(launch.raised)} ETH`,
    finalizeHash,
  );
}

// ── Phase 6: PORTFOLIO-AGGREGATE ────────────────────────────────────────

async function phase6_portfolio() {
  header(6, "PORTFOLIO-AGGREGATE", "workflow/portfolio-aggregate/portfolio-aggregate.ts");
  console.log(`  Action: balanceOf(wallet) for HDT + SIM tokens`);

  const hdtBal = await publicClient.readContract({
    address: HDT, abi: erc20Abi, functionName: "balanceOf", args: [WALLET],
  }) as bigint;

  const simBal = await publicClient.readContract({
    address: simTokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [WALLET],
  }) as bigint;

  success(
    "PORTFOLIO-AGGREGATE",
    `HDT=${formatEther(hdtBal)}, SIM=${formatEther(simBal)}`,
  );
}

// ── Phase 7: STATS-SYNC ────────────────────────────────────────────────

async function phase7_statsSync() {
  header(7, "STATS-SYNC", "workflow/stats-sync/stats-sync.ts");
  console.log("  Action: read nextAirdropId + nextLaunchId -> MannaIndex.updateStats()");

  const totalAirdrops = await publicClient.readContract({
    address: HUMANDROP, abi: humanDropAbi, functionName: "nextAirdropId",
  }) as bigint;

  const totalLaunches = await publicClient.readContract({
    address: FAIR_LAUNCH, abi: fairLaunchAbi, functionName: "nextLaunchId",
  }) as bigint;

  console.log(`  Airdrops: ${totalAirdrops}, Launches: ${totalLaunches}`);

  const hash = await walletClient.writeContract({
    address: MANNA_INDEX, abi: mannaIndexAbi, functionName: "updateStats",
    args: [totalAirdrops, totalLaunches, BigInt(0), BigInt(0)],
  });
  await writeTx(hash);

  // Verify
  const stats = await publicClient.readContract({
    address: MANNA_INDEX, abi: mannaIndexAbi, functionName: "getStats",
  }) as { totalAirdrops: bigint; totalLaunches: bigint; totalUsers: bigint; totalVolume: bigint; lastUpdate: bigint };

  success(
    "STATS-SYNC",
    `synced: airdrops=${stats.totalAirdrops}, launches=${stats.totalLaunches}`,
    hash,
  );
}

// ── Phase 8: AIRDROP-RECLAIM ────────────────────────────────────────────

async function phase8_airdropReclaim() {
  header(8, "AIRDROP-RECLAIM", "workflow/airdrop-reclaim/airdrop-reclaim.ts");
  console.log("  Action: iterate all airdrops, reclaim any active+expired ones");

  const nextId = await publicClient.readContract({
    address: HUMANDROP, abi: humanDropAbi, functionName: "nextAirdropId",
  }) as bigint;

  const now = BigInt(Math.floor(Date.now() / 1000));
  let reclaimed = 0;

  for (let i = BigInt(0); i < nextId; i++) {
    try {
      const airdrop = await publicClient.readContract({
        address: HUMANDROP, abi: humanDropAbi, functionName: "getAirdrop", args: [i],
      }) as { token: Address; expiry: bigint; active: boolean; totalClaimed: bigint; maxClaims: bigint; creator: Address };

      if (airdrop.active && airdrop.expiry < now) {
        console.log(`  Reclaiming airdrop #${i} (expired ${new Date(Number(airdrop.expiry) * 1000).toISOString()})`);
        const hash = await walletClient.writeContract({
          address: HUMANDROP, abi: humanDropAbi, functionName: "withdraw", args: [i],
        });
        await writeTx(hash);
        reclaimed++;
      }
    } catch { /* skip errors */ }
  }

  console.log(`  Scanned ${nextId} airdrops`);
  success("AIRDROP-RECLAIM", `reclaimed ${reclaimed} expired airdrops (scanned ${nextId} total)`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Manna Protocol — CRE Workflow Simulator             ║");
  console.log("║     Simulating all 8 workflows against Tenderly VNet    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  RPC: ${RPC_URL.slice(0, 50)}...`);
  console.log(`  Wallet: ${WALLET}`);
  console.log(`  Contracts: HumanDrop=${HUMANDROP.slice(0, 10)}... FairLaunch=${FAIR_LAUNCH.slice(0, 10)}...`);

  const phases = [
    phase1_tokenDeploy,
    phase2_tokenMint,
    phase3_airdropCreate,
    phase4_claim,
    phase5_fairLaunch,
    phase6_portfolio,
    phase7_statsSync,
    phase8_airdropReclaim,
  ];

  for (const phase of phases) {
    try {
      await phase();
    } catch (err) {
      const name = phase.name.replace("phase", "").replace(/_/g, " ").trim();
      const msg = err instanceof Error ? err.message : String(err);
      fail(name, msg);
    }
  }

  // Summary
  console.log("\n\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    SIMULATION RESULTS                    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");

  for (const r of results) {
    const icon = r.status === "SUCCESS" ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    const pad = " ".repeat(Math.max(0, 24 - r.workflow.length));
    console.log(`║  ${icon} ${r.workflow}${pad} ${r.detail.slice(0, 30)}`);
  }

  const passed = results.filter((r) => r.status === "SUCCESS").length;
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  ${passed}/8 workflows passed                                  ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  process.exit(passed === 8 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
