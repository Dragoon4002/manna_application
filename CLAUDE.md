# Manna Protocol — Full-Stack Sybil-Resistant DeFi Platform

> Token launches, airdrops, staking, and portfolio management for verified humans only.
> Powered by World ID + Chainlink CRE.

## 🎯 Current Status

**Contracts + CRE Workflows:** ✅ 95% Complete (88/88 tests passing)
**API Integration:** ⚠️ 0% Complete (10 routes needed)
**Frontend Wiring:** ⚠️ 20% Complete (6 pages need data integration)

See `DEPLOYMENT.md` for deployment guide and `API_SPEC.md` for required API routes.

## Feature Spec Reference

Full feature spec w/ all pages, contracts, API routes, CRE workflows, and implementation status:
**`manna_app/tasks/app-overview.md`**

---

## What It Does

HumanDrop lets project creators distribute tokens to verified humans across chains. World ID provides sybil resistance (one claim per human), Chainlink CRE orchestrates the cross-chain verification and distribution, and Tenderly provides the testing infrastructure.

**Problem:** Airdrops are farmed by bots and sybil accounts. Projects waste tokens on fake users.

**Solution:** Gate claims behind World ID proof-of-personhood. CRE bridges verification from World ID's ecosystem to any EVM chain — no native World ID support needed on the target chain.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        World App (Mini App)                      │
│  User taps Claim → MiniKit.verify() → ZK proof generated        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/claim
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Backend (manna/)                     │
│  Relays proof + airdropId + receiver to CRE HTTP Trigger         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRE Workflow (workflow/)                       │
│                                                                  │
│  1. ConfidentialHTTPClient → World ID Cloud API                  │
│     POST /api/v2/verify/{app_id} — verify ZK proof              │
│     (runs in enclave, API key never exposed)                     │
│                                                                  │
│  2. EVMClient.callContract() → Arbitrum Sepolia                  │
│     Read hasClaimed(airdropId, nullifierHash)                    │
│                                                                  │
│  3. EVMClient.writeReport() → HumanDrop contract                 │
│     claim(airdropId, nullifierHash, receiver, level)             │
│     Transfers tokens: Orb=100 HDT, Device=50 HDT                │
│                                                                  │
│  4. EVMClient.writeReport() → WorldIDVerifier contract           │
│     registerHuman(nullifierHash, level)                          │
│     Public good — any protocol can query isVerifiedHuman()       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Arbitrum Sepolia (target chain)                      │
│                                                                  │
│  HumanDrop.sol        — airdrop vault, tiered claims, escrow     │
│  WorldIDVerifier.sol  — public human registry                    │
│  HumanDropToken.sol   — test ERC20                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
human-gated-airdrop/
├── contracts/                    # Foundry — Solidity smart contracts (88 tests ✅)
│   ├── src/
│   │   ├── HumanDrop.sol         # Airdrop vault + claim logic + isEligible()
│   │   ├── FairLaunch.sol        # Token launch w/ bonding curve + getActiveLaunches()
│   │   ├── TokenFactory.sol      # Deploy custom ERC20s
│   │   ├── MannaToken.sol        # ERC20 w/ optional minting
│   │   ├── MannaIndex.sol        # 🆕 Protocol stats registry
│   │   ├── StakingVault.sol      # Stake tokens, earn rewards
│   │   ├── VestingVault.sol      # Token vesting schedules
│   │   ├── BatchPayout.sol       # Multi-recipient distributions
│   │   └── WorldIDVerifier.sol   # Public good human registry
│   ├── test/                     # 88 tests across 7 contracts
│   └── script/
│       └── Deploy.s.sol          # Multi-chain deployment
│
├── workflow/                     # CRE — 8 workflows (4 new ✅)
│   ├── main.ts                   # HTTP: airdrop claim w/ World ID verification
│   ├── token-mint.ts             # 🆕 HTTP: mint additional token supply
│   ├── token-deploy.ts           # HTTP: deploy ERC20 via TokenFactory
│   ├── airdrop-create.ts         # HTTP: create airdrop on target chain
│   ├── airdrop-reclaim.ts        # 🆕 Cron (6h): auto-reclaim expired airdrops
│   ├── portfolio-aggregate.ts    # 🆕 HTTP: read balances across 3 chains
│   ├── stats-sync.ts             # 🆕 Cron (10min): sync stats to MannaIndex
│   ├── fair-launch-finalize.ts   # Cron (5min): auto-finalize ended launches
│   ├── abi.ts                    # 🆕 Extended w/ new contract ABIs
│   └── *.workflow.yaml           # 8 workflow configs + staging.json
│
├── manna_app/                    # Next.js — World Mini App (needs API wiring ⚠️)
│   ├── src/app/api/              # ⚠️ 10 API routes needed (see API_SPEC.md)
│   │   ├── claim/route.ts        # ✅ POST — relay proof to CRE
│   │   ├── airdrop/
│   │   │   ├── list/route.ts     # ✅ GET — list active airdrops
│   │   │   └── eligibility/      # ❌ GET — check isEligible (NEEDED)
│   │   ├── launch/list/          # ❌ GET — getActiveLaunches (NEEDED)
│   │   ├── token/mint/           # ❌ POST — trigger token-mint.ts (NEEDED)
│   │   ├── portfolio/            # ❌ GET — trigger portfolio-aggregate (NEEDED)
│   │   ├── stats/                # ❌ GET — read MannaIndex (NEEDED)
│   │   ├── staking/              # ❌ stake/unstake/positions (NEEDED)
│   │   └── payouts/              # ❌ create/history (NEEDED)
│   ├── src/app/(protected)/      # 6 pages need real data
│   │   ├── airdrops/             # ⚠️ Needs eligibility check integration
│   │   ├── fair-launch/          # ⚠️ Placeholder only, needs launch list
│   │   ├── utilities/token-mint/ # ⚠️ Needs deployment form
│   │   ├── staking/              # ⚠️ Needs real positions data
│   │   ├── dashboards/           # ⚠️ Needs MannaIndex stats
│   │   └── portfolio/            # ⚠️ Needs multi-chain balances
│   └── src/abi/                  # Contract ABIs (from Foundry build)
│
├── tasks/
│   └── todo.md                   # Phase 6 ✅ complete, Phase 7 in progress
│
├── DEPLOYMENT.md                 # 🆕 Complete deployment guide
├── API_SPEC.md                   # 🆕 10 API routes w/ implementations
└── README_NEXT_STEPS.md          # 🆕 Human + Claude handoff guide
```

---

## Chainlink / CRE Files

| File | Type | Purpose |
|------|------|---------|
| `workflow/main.ts` | HTTP | Airdrop claim w/ World ID verification |
| `workflow/token-mint.ts` | HTTP | Mint additional token supply (multi-chain) |
| `workflow/token-deploy.ts` | HTTP | Deploy ERC20 via TokenFactory |
| `workflow/airdrop-create.ts` | HTTP | Create airdrop on target chain |
| `workflow/airdrop-reclaim.ts` | Cron (6h) | Auto-reclaim expired airdrops |
| `workflow/portfolio-aggregate.ts` | HTTP | Read balances across 3 chains |
| `workflow/stats-sync.ts` | Cron (10min) | Aggregate stats → MannaIndex |
| `workflow/fair-launch-finalize.ts` | Cron (5min) | Auto-finalize ended launches |
| `contracts/src/HumanDrop.sol` | Contract | Airdrop vault — CRE operator writes claims |
| `contracts/src/FairLaunch.sol` | Contract | Token launch — CRE operator finalizes |
| `contracts/src/TokenFactory.sol` | Contract | Token deployment — CRE operator deploys |
| `contracts/src/MannaIndex.sol` | Contract | Stats registry — CRE operator updates |

---

## Smart Contracts

### Core Contracts

**HumanDrop.sol** — Airdrop vault + claim logic
- `createAirdrop(token, amountOrb, amountDevice, maxClaims, expiry)` — creator sets up campaign
- `claim(airdropId, nullifierHash, receiver, level)` — CRE operator only, distributes tokens
- `isEligible(airdropId, nullifierHash)` — 🆕 check eligibility before claiming
- `withdraw(airdropId)` — creator reclaims unclaimed tokens after expiry
- Tiered: Orb-verified humans get more than Device-verified

**FairLaunch.sol** — Token launch w/ bonding curve
- `createLaunch(token, totalTokens, hardCap, softCap, duration, maxPerWallet, startPrice, endPrice)` — create launch
- `contribute()` — buy tokens at current bonding curve price
- `finalize(launchId)` — CRE operator finalizes after endTime
- `getActiveLaunches()` — 🆕 returns all non-finalized launches
- `claim()` — claim tokens if launch succeeded
- `refund()` — get refund if softcap missed

**TokenFactory.sol** — Deploy custom ERC20s
- `deployToken(name, symbol, initialSupply, decimals, owner, enableMinting)` — CRE operator deploys
- Creates MannaToken instances with optional minting

**MannaIndex.sol** — 🆕 Protocol stats registry
- `updateStats(totalAirdrops, totalLaunches, totalUsers, totalVolume)` — CRE operator updates
- `updateChainStats(chainName, airdrops, launches, users, volume)` — per-chain stats
- `getStats()` — public view for dashboards

**StakingVault.sol** — Stake tokens, earn rewards
- `stake(amount, lockPeriod)` — lock tokens for rewards
- `unstake(positionId)` — withdraw after lock expires
- `claimRewards(positionId)` — claim accrued rewards
- `getPositions(wallet)` — view all user positions

**BatchPayout.sol** — Multi-recipient distributions
- `distribute(token, recipients[], amounts[])` — batch transfers
- `getPayouts(sender)` — view payout history

**WorldIDVerifier.sol** — Public good human registry
- `registerHuman(nullifierHash, verificationLevel)` — CRE operator only
- `isVerifiedHuman(nullifierHash)` — public view, any protocol can use

---

## Setup

### 1. Contracts

```bash
cd contracts
forge build
forge test -vv     # 88 tests across 7 contracts, all passing
```

### 2. Deploy to Tenderly Virtual TestNet

```bash
# Create Virtual TestNet in Tenderly dashboard (fork Arbitrum Sepolia)
# Get the RPC URL from Tenderly

export PRIVATE_KEY=your_deployer_key
export CRE_OPERATOR=0x_cre_operator_address

forge script script/Deploy.s.sol --rpc-url $TENDERLY_RPC --broadcast
```

### 3. CRE Workflow

```bash
cd workflow
bun install
# Update config.staging.json with deployed contract addresses

# Simulate locally
cre workflow simulate
```

### 4. Mini App

```bash
cd manna
npm install
cp .env.sample .env.local
# Fill in: ARBITRUM_SEPOLIA_RPC, NEXT_PUBLIC_HUMANDROP_ADDRESS, CRE_WORKFLOW_URL
npm run dev
```

---

## Hackathon Tracks

| Track | How Satisfied |
|-------|--------------|
| **World ID + CRE** | CRE verifies World ID proof via Cloud API, writes to Arb Sepolia (non-World chain) |
| **World Mini App + CRE** | Mini App uses walletAuth + verify, backend triggers CRE, result shown in UI |
| **Tenderly** | Contracts deployed on Virtual TestNet (Arb Sepolia fork), txs visible in Explorer |
| **DeFi & Tokenization** | CRE integrates blockchain (Arb Sepolia) + external system (World ID API) |

---

## Security

- **Sybil resistance** — World ID nullifier hash = one claim per human per airdrop
- **Operator gating** — only CRE's consensus-signed reports can call `claim()` and `registerHuman()`
- **Double-claim** — checked both by CRE (reads before writing) and contract (reverts on duplicate)
- **Confidential secrets** — World ID API key stays in CRE's VaultDON enclave

---

## Tech Stack

- **Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin v5
- **CRE:** TypeScript, @chainlink/cre-sdk, viem
- **Frontend:** Next.js 15, React 19, @worldcoin/minikit-js, @worldcoin/mini-apps-ui-kit-react
- **Testing:** Tenderly Virtual TestNet (Arbitrum Sepolia fork)
- **Target chain:** Arbitrum Sepolia
