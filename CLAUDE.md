# Manna Protocol — Full-Stack Sybil-Resistant DeFi Platform

> Token launches, airdrops, staking, and portfolio management for verified humans only.
> Powered by World ID + Chainlink CRE.

## Current Status

**Contracts:** ✅ 100% (9 contracts, 96/96 tests, deployed to Tenderly VNet)
**CRE Workflows:** ✅ 100% (8 workflows written, deployment blocked on CRE staging URL)
**API Routes:** ✅ 100% (37 routes)
**Frontend:** ✅ 100% (24 pages, 24 components, 5-tab nav, clean build — 50 pages total)
**Auth:** ✅ DEBUG mode bypass for local dev (no World ID needed)

### What's Left
- CRE workflow deployment (needs staging URL)
- E2E testing of all flows
- Demo video + submission

---

## What It Does

Manna lets project creators distribute tokens to verified humans across chains. World ID provides sybil resistance (one claim per human), Chainlink CRE orchestrates cross-chain verification and distribution, Tenderly provides testing infra.

**Problem:** Airdrops farmed by bots/sybils. Projects waste tokens on fake users.
**Solution:** Gate claims behind World ID proof-of-personhood. CRE bridges verification from World ID to any EVM chain.

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
│                     Next.js Backend (manna_app/)                 │
│  37 API routes — reads via publicClient, writes via walletClient │
│  DEBUG mode: env wallet bypass, no World ID needed               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST (CRE relay) / direct write
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRE Workflow (workflow/)                       │
│  8 workflows: claim, mint, deploy, create, reclaim,              │
│  portfolio, stats-sync, fair-launch-finalize                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Arbitrum Sepolia (Tenderly VNet)                     │
│  9 contracts: HumanDrop, FairLaunch, TokenFactory, MannaToken,   │
│  MannaIndex, StakingVault, VestingVault, BatchPayout,            │
│  WorldIDVerifier                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
human-gated-airdrop/
├── contracts/                    # Foundry — 9 contracts, 96 tests ✅
│   ├── src/
│   │   ├── HumanDrop.sol         # Airdrop vault + claim + isEligible + withdraw
│   │   ├── FairLaunch.sol        # Token launch w/ bonding curve + getActiveLaunches
│   │   ├── TokenFactory.sol      # Deploy custom ERC20s
│   │   ├── MannaToken.sol        # ERC20 w/ optional minting
│   │   ├── MannaIndex.sol        # Protocol stats registry
│   │   ├── StakingVault.sol      # Stake tokens, earn rewards
│   │   ├── VestingVault.sol      # Token vesting schedules
│   │   ├── BatchPayout.sol       # Multi-recipient distributions
│   │   └── WorldIDVerifier.sol   # Public good human registry
│   ├── test/                     # 96 tests (88 unit + 8 integration)
│   └── script/DeployAll.s.sol    # BatchDeployer — all 9 in 1 tx
│
├── workflow/                     # CRE — 8 workflows
│   ├── claim/main.ts             # HTTP: airdrop claim w/ World ID
│   ├── token-mint/main.ts        # HTTP: mint token supply
│   ├── token-deploy/main.ts      # HTTP: deploy ERC20 via TokenFactory
│   ├── airdrop-create/main.ts    # HTTP: create airdrop
│   ├── airdrop-reclaim/main.ts   # Cron (6h): reclaim expired airdrops
│   ├── portfolio-aggregate/main.ts # HTTP: read balances across 3 chains
│   ├── stats-sync/main.ts        # Cron (10min): sync stats → MannaIndex
│   └── fair-launch-finalize/main.ts # Cron (5min): finalize ended launches
│
├── manna_app/                    # Next.js 15 — World Mini App
│   ├── src/app/api/              # 37 API routes ✅
│   │   ├── airdrop/              # list, [id], claim, create, eligibility
│   │   ├── launch/               # list, [id], create, contribute, claim, refund
│   │   ├── token/                # list, [address], deploy, mint, transfer
│   │   ├── staking/              # positions, position/[id], stake, unstake, claim-rewards
│   │   ├── vesting/              # schedules, schedule/[id], create, claim, revoke
│   │   ├── payouts/              # history, [id], create
│   │   ├── portfolio/            # multi-chain balances
│   │   ├── stats/                # MannaIndex stats
│   │   └── cron/                 # finalize, reclaim, stats-sync
│   │
│   ├── src/app/(protected)/      # 24 pages across 5 tabs ✅
│   │   ├── home/                 # Dashboard + quick actions
│   │   ├── wallet/               # Send tokens
│   │   ├── explore/              # Browse airdrops/launches/tokens + detail pages
│   │   ├── create/               # Deploy token, mint, create airdrop/launch
│   │   ├── history/              # Activity timeline + detail pages
│   │   └── more/                 # Staking, vesting, payouts, portfolio, stats
│   │
│   ├── src/components/           # 24 components ✅
│   │   ├── BottomNav/            # 5-tab nav (Home, Explore, Create, History, More)
│   │   ├── GlassCard/, StatCard/, NavCard/, AirdropCard/, TokenInput/
│   │   ├── FormField/, DetailRow/, StatusBadge/, SearchBar/
│   │   ├── EmptyState/, SectionHeader/, ProgressBar/
│   │   ├── Navbar/, AuthGate/, AuthButton/
│   │   └── Navigation/, Sidebar/, PageLayout/, Verify/, Pay/, etc.
│   │
│   ├── src/abi/                  # All contract ABIs
│   ├── src/lib/contracts.ts      # All 9 contract address exports
│   └── src/lib/auth.ts           # getAuthSession() w/ DEBUG bypass
│
├── tasks/todo.md                 # Progress tracker
├── API_SPEC.md                   # API route specs
├── DEPLOYMENT.md                 # Deployment guide
└── README_NEXT_STEPS.md          # Handoff guide
```

---

## 5-Tab Navigation

| Tab | Icon | Pages |
|-----|------|-------|
| **Home** | Home | `/home`, `/wallet` |
| **Explore** | Search | `/explore`, `/explore/airdrop/[id]`, `/explore/launch/[id]`, `/explore/token/[address]` |
| **Create** | Plus (center) | `/create`, `/create/token`, `/create/token/mint`, `/create/airdrop`, `/create/launch` |
| **History** | Clock | `/history`, `/history/claim/[id]`, `/history/contribution/[id]`, `/history/payout/[id]` |
| **More** | Menu | `/more`, `/more/staking`, `/more/staking/[positionId]`, `/more/vesting`, `/more/vesting/[scheduleId]`, `/more/payouts`, `/more/payouts/[id]`, `/more/portfolio`, `/more/stats` |

---

## Chainlink / CRE Files

| File | Type | Purpose |
|------|------|---------|
| `workflow/claim/main.ts` | HTTP | Airdrop claim w/ World ID verification |
| `workflow/token-mint/main.ts` | HTTP | Mint additional token supply |
| `workflow/token-deploy/main.ts` | HTTP | Deploy ERC20 via TokenFactory |
| `workflow/airdrop-create/main.ts` | HTTP | Create airdrop on target chain |
| `workflow/airdrop-reclaim/main.ts` | Cron (6h) | Auto-reclaim expired airdrops |
| `workflow/portfolio-aggregate/main.ts` | HTTP | Read balances across 3 chains |
| `workflow/stats-sync/main.ts` | Cron (10min) | Aggregate stats → MannaIndex |
| `workflow/fair-launch-finalize/main.ts` | Cron (5min) | Auto-finalize ended launches |

---

## Smart Contracts

**HumanDrop.sol** — Airdrop vault + claim logic
- `createAirdrop(token, amountOrb, amountDevice, maxClaims, expiry)`
- `claim(airdropId, nullifierHash, receiver, level)` — CRE operator only
- `isEligible(airdropId, nullifierHash)` — eligibility check
- `withdraw(airdropId)` — reclaim after expiry (creator/operator/owner)

**FairLaunch.sol** — Token launch w/ bonding curve
- `createLaunch(token, totalTokens, hardCap, softCap, duration, maxPerWallet, startPrice, endPrice)`
- `contribute()`, `finalize(launchId)`, `claim()`, `refund()`
- `getActiveLaunches()` — returns non-finalized launches

**TokenFactory.sol** — Deploy custom ERC20s via `deployToken()`

**MannaIndex.sol** — Protocol stats registry (`updateStats`, `getStats`)

**StakingVault.sol** — `stake()`, `unstake()`, `claimRewards()`, `getPositions()`

**VestingVault.sol** — `createSchedule()`, `claim()`, `revoke()`, `getSchedule()`

**BatchPayout.sol** — `distribute()`, `getPayouts()`

**WorldIDVerifier.sol** — `registerHuman()`, `isVerifiedHuman()`

---

## Deployed Addresses (Tenderly VNet — Arb Sepolia Fork)

| Contract | Address |
|----------|---------|
| HumanDrop | `0x0ed584cbaf3d6dB14Eb5cCdce441aE2409524AAC` |
| FairLaunch | `0xabeE9807Bb7f3F22cB676e77F3c354F3b5a9C02C` |
| TokenFactory | `0x5067896B905A2464Afab3CDF59f6CAf7E71f95eb` |
| MannaIndex | `0x43AA95Fc38444D71eA971dDA9CdB486fB21a725d` |
| HDT | `0x01768ffFb5E313915aDFe93b6a4369B4ef9991CB` |
| Server Wallet | `0x53cFee9b964ccc90003f02fb8e0b0985071F4002` |

RPC: `https://virtual.arbitrum-sepolia.eu.rpc.tenderly.co/6a9f849c-604c-4d4e-99f7-1394077fb61f`

---

## Setup

### Contracts
```bash
cd contracts && forge build && forge test -vv  # 96 tests
```

### Deploy to Tenderly
```bash
export PRIVATE_KEY=0x... CRE_OPERATOR=0x...
forge script script/DeployAll.s.sol --tc DeployAll --rpc-url $TENDERLY_RPC --broadcast
```

### Mini App
```bash
cd manna_app && npm install && cp .env.sample .env.local
# Fill .env.local, then:
npm run dev  # http://localhost:3000
```

### Debug Mode (local dev without World ID)
Set in `.env.local`:
```
DEBUG_MODE=true
NEXT_PUBLIC_DEFAULT_WALLET='0x53cFee9b964ccc90003f02fb8e0b0985071F4002'
```

---

## Key Patterns

### Server wallet writes
All on-chain writes go through `CREATOR_PRIVATE_KEY` server wallet via `getWalletClient()` in `contracts.ts`.

### Session wallet
```typescript
const wallet = session?.user?.walletAddress ?? process.env.NEXT_PUBLIC_DEFAULT_WALLET ?? '0x0';
```

### BigInt compatibility
No `0n` literals — use `BigInt(0)`. TypeScript target < ES2020.

### Dynamic route params (Next.js 15)
```typescript
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
```

---

## Hackathon Tracks

| Track | How Satisfied |
|-------|--------------|
| **World ID + CRE** | CRE verifies World ID proof via Cloud API, writes to Arb Sepolia |
| **World Mini App + CRE** | Mini App uses walletAuth + verify, backend triggers CRE |
| **Tenderly** | Contracts deployed on Virtual TestNet, txs visible in Explorer |
| **DeFi & Tokenization** | CRE integrates blockchain + external system (World ID API) |

---

## Security

- **Sybil resistance** — World ID nullifier hash = one claim per human per airdrop
- **Operator gating** — only CRE's consensus-signed reports can call `claim()` and `registerHuman()`
- **Double-claim** — checked both by CRE and contract (reverts on duplicate)
- **Confidential secrets** — World ID API key stays in CRE's VaultDON enclave

---

## Tech Stack

- **Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin v5
- **CRE:** TypeScript, @chainlink/cre-sdk, viem
- **Frontend:** Next.js 15, React 19, @worldcoin/minikit-js, iconoir-react
- **Testing:** Tenderly Virtual TestNet (Arbitrum Sepolia fork)
- **Target chain:** Arbitrum Sepolia
