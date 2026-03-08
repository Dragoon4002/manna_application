# Manna Protocol — TODO

## Architecture: CRE-only (no CCIP)
User → MiniKit.verify() → Backend → CRE HTTP Trigger → verify proof → write to Arb Sepolia → return tx hash

## Phase 1: Smart Contracts ✅
- [x] Init Foundry + OpenZeppelin
- [x] `WorldIDVerifier.sol` — public good human registry
- [x] `HumanDrop.sol` — airdrop vault + claim logic
- [x] `HumanDropToken.sol` — test ERC20
- [x] `HumanDrop.t.sol` — 15 tests, all passing
- [x] `Deploy.s.sol` — deploys all 3 contracts + creates test airdrop

## Phase 2: CRE Workflow ✅
- [x] `workflow/main.ts` — HTTP trigger, verify proof, check nullifier, write claim, register human
- [x] `workflow.yaml`, `config.staging.json`, `package.json`, `tsconfig.json`

## Phase 3: Backend API ✅
- [x] `POST /api/claim` — forward proof to CRE workflow
- [x] `GET /api/airdrops` — read active airdrops from contract
- [x] `GET /api/claim-status` — check if nullifier claimed

## Phase 4: Frontend ✅
- [x] `AirdropList` — shows active airdrops w/ claim buttons
- [x] `ClaimFlow` — verify → claim → confirmation w/ tx hash
- [x] `ClaimHistory` — localStorage-based claim tracking
- [x] Updated home page (replaced demo components)
- [x] Updated navigation (5-tab BottomNav)
- [x] Claims page route

## Phase 5: Deployment & Testing ✅
- [x] Create Tenderly Virtual TestNet (Arb Sepolia fork)
- [x] Deploy all 9 contracts via BatchDeployer (1 tx, 1 block)
- [x] Update .env.local with all deployed addresses
- [ ] Install CRE workflow deps + simulate
- [ ] E2E test: Mini App → verify → claim → Tenderly Explorer

## Phase 6: Additional Features ✅

### Smart Contracts
- [x] `MannaIndex.sol` — on-chain stats registry
- [x] `MannaIndex.t.sol` — 9 tests, all passing
- [x] `HumanDrop.isEligible()` — eligibility check view
- [x] `FairLaunch.getActiveLaunches()` — query non-finalized launches

### CRE Workflows
- [x] `token-mint.ts` — HTTP trigger, mint token supply (multi-chain)
- [x] `airdrop-reclaim.ts` — Cron (6h), auto-reclaim expired airdrops
- [x] `portfolio-aggregate.ts` — HTTP trigger, read balances across 3 chains
- [x] `stats-sync.ts` — Cron (10min), aggregate stats → MannaIndex

### Config + ABIs
- [x] All 8 workflow YAMLs + staging configs
- [x] Extended abi.ts w/ MannaIndex, MannaToken.mint, eligibility ABIs

**Test Results:** 88/88 tests passing

## Phase 6.5: Integration Tests ✅
- [x] `Integration.t.sol` — 8 end-to-end tests
- [x] Fix `HumanDrop.withdraw()` — allow operator + owner
- [x] Copy ABIs to manna_app/src/abi/
- [x] Add 6 address exports to `lib/contracts.ts`

**Test Results:** 96/96 tests passing (88 unit + 8 integration)

## Phase 7: Full API + Frontend Integration ✅

### Contract Deployment ✅
- [x] Deploy all 9 contracts to Tenderly VNet via BatchDeployer
- [x] Update .env.local with deployed addresses
- [x] Operators set during deployment

### Backend API Routes — 37 total ✅
- [x] `GET /api/airdrop/list` — list active airdrops
- [x] `GET /api/airdrop/[id]` — single airdrop detail
- [x] `POST /api/airdrop/claim` — CRE relay (auth-guarded)
- [x] `POST /api/airdrop/create` — backend wallet write
- [x] `GET /api/airdrop/eligibility` — isEligible() check
- [x] `GET /api/launch/list` — FairLaunch listing w/ bonding curve
- [x] `GET /api/launch/[id]` — single launch detail + user data
- [x] `POST /api/launch/create` — create fair launch
- [x] `POST /api/launch/contribute` — contribute to launch
- [x] `POST /api/launch/claim` — claim launch tokens
- [x] `POST /api/launch/refund` — refund failed launch
- [x] `GET /api/token/list` — list deployed tokens
- [x] `GET /api/token/[address]` — single token detail
- [x] `POST /api/token/deploy` — deploy ERC20 via TokenFactory
- [x] `POST /api/token/mint` — CRE relay for minting
- [x] `POST /api/token/transfer` — transfer tokens
- [x] `GET /api/staking/positions` — list user positions
- [x] `GET /api/staking/position/[id]` — single position detail
- [x] `POST /api/staking/stake` — stake tokens
- [x] `POST /api/staking/unstake` — unstake
- [x] `POST /api/staking/claim-rewards` — claim staking rewards
- [x] `GET /api/vesting/schedules` — list vesting schedules
- [x] `GET /api/vesting/schedule/[id]` — single schedule detail
- [x] `POST /api/vesting/create` — create vesting schedule
- [x] `POST /api/vesting/claim` — claim vested tokens
- [x] `POST /api/vesting/revoke` — revoke vesting
- [x] `GET /api/payouts/history` — payout history
- [x] `GET /api/payouts/[id]` — single payout detail
- [x] `POST /api/payouts/create` — batch payout
- [x] `GET /api/portfolio` — balances + staking + vesting
- [x] `GET /api/stats` — MannaIndex stats + chain stats
- [x] `GET /api/cron/finalize` — auto-finalize ended launches
- [x] `GET /api/cron/reclaim` — auto-reclaim expired airdrops
- [x] `GET /api/cron/stats-sync` — sync stats to MannaIndex
- [x] `POST /api/verify-proof` — World ID proof verification
- [x] `POST /api/initiate-payment` — payment initiation
- [x] `GET /api/auth/[...nextauth]` — NextAuth handlers

### Frontend — 24 pages across 5 tabs ✅
- [x] `/home` — dashboard w/ stats, quick actions, recent airdrops/launches
- [x] `/wallet` — send tokens (token selector, recipient, amount)
- [x] `/explore` — mixed feed of airdrops + launches + tokens w/ search
- [x] `/explore/airdrop/[id]` — airdrop detail + claim
- [x] `/explore/launch/[id]` — launch detail + contribute/claim/refund
- [x] `/explore/token/[address]` — token detail + balance
- [x] `/create` — hub (Deploy Token, Mint, Create Airdrop, Create Launch)
- [x] `/create/token` — deploy ERC20 form
- [x] `/create/token/mint` — mint tokens form
- [x] `/create/airdrop` — create airdrop form
- [x] `/create/launch` — create fair launch form
- [x] `/history` — aggregated timeline from 4 APIs w/ tab filters
- [x] `/history/claim/[id]` — read-only airdrop detail
- [x] `/history/contribution/[id]` — read-only launch detail
- [x] `/history/payout/[id]` — read-only payout detail
- [x] `/more` — hub (Staking, Vesting, Payouts, Portfolio, Stats)
- [x] `/more/staking` — stake form + positions list
- [x] `/more/staking/[positionId]` — position detail + unstake/claim
- [x] `/more/vesting` — schedules list + claim/revoke
- [x] `/more/vesting/[scheduleId]` — schedule detail + claim/revoke
- [x] `/more/payouts` — inline create + history
- [x] `/more/payouts/[id]` — payout detail
- [x] `/more/portfolio` — multi-chain balances
- [x] `/more/stats` — protocol stats + chain stats

### Shared Components — 24 total ✅
- [x] GlassCard, StatCard, NavCard, AirdropCard, TokenInput (pre-existing)
- [x] Navbar, BottomNav (5-tab), AuthGate, AuthButton (pre-existing, modified)
- [x] FormField, DetailRow, StatusBadge, SearchBar, EmptyState, SectionHeader, ProgressBar (new)
- [x] Navigation, Sidebar, PageLayout, Verify, Pay, Transaction, ViewPermissions, UserInfo (pre-existing)

### Auth & Security ✅
- [x] NextAuth + SIWE + walletAuth() — JWT session
- [x] `lib/auth.ts` — getAuthSession() w/ DEBUG mode bypass
- [x] AuthGate w/ DEBUG mode bypass
- [x] Middleware w/ DEBUG mode bypass
- [x] Auth guards on all POST routes (401 if no session)

### Debug Mode ✅
- [x] `DEBUG_MODE=true` in .env.local bypasses auth everywhere
- [x] `NEXT_PUBLIC_DEFAULT_WALLET` used as fake session wallet
- [x] No World ID / MiniKit needed for local dev

## Phase 8: Remaining Work

### CRE Workflow Deployment (BLOCKED — needs CRE staging URL)
- [ ] Deploy all 8 CRE workflows to staging
- [ ] Set CRE_WORKFLOW_URL in .env.local
- [ ] Set VaultDON secrets (World ID API key)

### E2E Testing
- [ ] Test all 5 tabs render correctly
- [ ] Test create flows (token, airdrop, launch)
- [ ] Test explore detail pages load data
- [ ] Test history aggregation
- [ ] Test staking/vesting/payouts flows
- [ ] E2E: Mini App → verify → claim → Tenderly Explorer

### Polish & Submission
- [ ] Fix any UI bugs found during testing
- [ ] Architecture docs / README finalization
- [ ] Demo video (3-5 min)
- [ ] Submission form

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

---

## Resolved Questions
1. **Eligibility** → Open to all verified humans
2. **Architecture** → CRE-only (no CCIP)
3. **Amount** → Tiered (Orb gets more than Device)
4. **Multi-campaign** → Yes, multiple airdrops per contract
5. **Token** → Test ERC20 (HumanDropToken)
6. **Upgradeable** → No, immutable
7. **Page structure** → 5-tab (Home, Explore, Create, History, More)
8. **History** → Client-side aggregation from 4 APIs
9. **Wallet page** → Send-only (no receive/swap)
10. **Explore default** → All items mixed feed
