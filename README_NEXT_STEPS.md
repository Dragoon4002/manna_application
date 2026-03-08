# Next Steps — Manna Protocol

## What's Done

### Smart Contracts — 9 contracts, 96 tests ✅
All contracts written, tested (88 unit + 8 integration), deployed to Tenderly VNet via BatchDeployer.
- HumanDrop, FairLaunch, TokenFactory, MannaToken, MannaIndex
- StakingVault, VestingVault, BatchPayout, WorldIDVerifier

### CRE Workflows — 8 workflows ✅
All workflow code written. Not yet deployed (needs CRE staging URL).
- claim, token-mint, token-deploy, airdrop-create
- airdrop-reclaim (cron 6h), portfolio-aggregate, stats-sync (cron 10min), fair-launch-finalize (cron 5min)

### API Routes — 37 routes ✅
All routes built and building cleanly.

| Category | Routes |
|----------|--------|
| Airdrop | `list`, `[id]`, `claim`, `create`, `eligibility` |
| Launch | `list`, `[id]`, `create`, `contribute`, `claim`, `refund` |
| Token | `list`, `[address]`, `deploy`, `mint`, `transfer` |
| Staking | `positions`, `position/[id]`, `stake`, `unstake`, `claim-rewards` |
| Vesting | `schedules`, `schedule/[id]`, `create`, `claim`, `revoke` |
| Payouts | `history`, `[id]`, `create` |
| Other | `portfolio`, `stats`, `cron/finalize`, `cron/reclaim`, `cron/stats-sync`, `verify-proof`, `initiate-payment`, `auth/[...nextauth]` |

### Frontend — 24 pages, 5-tab nav ✅
Full app restructured into 5 tabs. Clean build (50 pages, 0 errors).

| Tab | Pages |
|-----|-------|
| Home | `/home` (dashboard), `/wallet` (send tokens) |
| Explore | `/explore` (feed), `/explore/airdrop/[id]`, `/explore/launch/[id]`, `/explore/token/[address]` |
| Create | `/create` (hub), `/create/token`, `/create/token/mint`, `/create/airdrop`, `/create/launch` |
| History | `/history` (timeline), `/history/claim/[id]`, `/history/contribution/[id]`, `/history/payout/[id]` |
| More | `/more` (hub), `/more/staking`, `/more/staking/[positionId]`, `/more/vesting`, `/more/vesting/[scheduleId]`, `/more/payouts`, `/more/payouts/[id]`, `/more/portfolio`, `/more/stats` |

### Components — 24 total ✅
Pre-existing: GlassCard, StatCard, NavCard, AirdropCard, TokenInput, Navbar, BottomNav, AuthGate, AuthButton, Navigation, Sidebar, PageLayout, Verify, Pay, Transaction, ViewPermissions, UserInfo
New: FormField, DetailRow, StatusBadge, SearchBar, EmptyState, SectionHeader, ProgressBar

### Auth — DEBUG mode bypass ✅
- `DEBUG_MODE=true` skips World ID auth in AuthGate, getAuthSession(), middleware
- `NEXT_PUBLIC_DEFAULT_WALLET` used as fake session wallet
- All POST routes have auth guards (401 without session)

### Infrastructure ✅
- All ABIs in `manna_app/src/abi/`
- All 9 contract addresses in `lib/contracts.ts`
- `.env.local` fully configured for Tenderly VNet

---

## What's Left

### 1. CRE Workflow Deployment (BLOCKED)
Needs CRE staging URL from Chainlink.
```bash
cre workflow deploy --workflow-file claim.workflow.yaml --environment staging
# repeat for all 8 workflows
# then set CRE_WORKFLOW_URL in .env.local
# set VaultDON secrets (World ID API key)
```

### 2. E2E Testing
- Start dev server: `cd manna_app && npx next dev -p 3001`
- Test all 5 tabs render
- Test create flows (token deploy, airdrop create, launch create)
- Test explore detail pages load on-chain data
- Test history timeline aggregation
- Test staking stake/unstake, vesting claim/revoke, payouts create
- Full flow: Mini App → World ID verify → claim → check Tenderly Explorer

### 3. Demo Video (3-5 min)
Show: claim flow, launch contribute, portfolio view, stats dashboard, World ID verification, CRE automation, Tenderly Explorer txs.

### 4. Submission
- Finalize README
- Record demo
- Fill submission form

---

## Quick Start (Local Dev)

```bash
# 1. Contracts
cd contracts && forge test -vv  # 96 tests

# 2. Frontend
cd manna_app && npm install
# ensure .env.local has DEBUG_MODE=true + all addresses
npx next dev -p 3001

# 3. Open http://localhost:3001/home
```

---

## Deployed Addresses (Tenderly VNet)

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

## File Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Architecture, status, patterns, setup |
| `tasks/todo.md` | Phase-by-phase progress tracker |
| `API_SPEC.md` | API route specs |
| `DEPLOYMENT.md` | Deployment guide |
| `README_NEXT_STEPS.md` | This file — what's done + what's left |
