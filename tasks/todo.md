# HumanDrop - TODO

## Architecture: CRE-only (no CCIP)
User → MiniKit.verify() → Backend → CRE HTTP Trigger → verify proof → write to Arb Sepolia → return tx hash

## Phase 1: Smart Contracts (Foundry)
- [x] Init Foundry + OpenZeppelin
- [x] `WorldIDVerifier.sol` — public good human registry
- [x] `HumanDrop.sol` — airdrop vault + claim logic
- [x] `HumanDropToken.sol` — test ERC20
- [x] `HumanDrop.t.sol` — 15 tests, all passing
- [x] `Deploy.s.sol` — deploys all 3 contracts + creates test airdrop

## Phase 2: CRE Workflow
- [x] `workflow/main.ts` — HTTP trigger, verify proof, check nullifier, write claim, register human
- [x] `workflow.yaml`, `config.staging.json`, `package.json`, `tsconfig.json`

## Phase 3: Backend API
- [x] `POST /api/claim` — forward proof to CRE workflow
- [x] `GET /api/airdrops` — read active airdrops from contract
- [x] `GET /api/claim-status` — check if nullifier claimed

## Phase 4: Frontend
- [x] `AirdropList` — shows active airdrops w/ claim buttons
- [x] `ClaimFlow` — verify → claim → confirmation w/ tx hash
- [x] `ClaimHistory` — localStorage-based claim tracking
- [x] Updated home page (replaced demo components)
- [x] Updated navigation (Airdrops, Claims, Profile tabs)
- [x] Claims page route

## Phase 5: Deployment & Testing
- [ ] Create Tenderly Virtual TestNet (Arb Sepolia fork)
- [ ] Deploy contracts via `forge script`
- [ ] Update config with deployed addresses
- [ ] Install CRE workflow deps + simulate
- [ ] E2E test: Mini App → verify → claim → Tenderly Explorer

## Phase 6: Additional Features (7 New) ✅ COMPLETED

### Smart Contracts
- [x] `MannaIndex.sol` — on-chain stats registry (updateStats, getStats)
- [x] `MannaIndex.t.sol` — 9 tests, all passing
- [x] `HumanDrop.isEligible()` — eligibility check view function
- [x] `FairLaunch.getActiveLaunches()` — query non-finalized launches

### CRE Workflows
- [x] `token-mint.ts` — HTTP trigger, mint additional token supply (multi-chain)
- [x] `airdrop-reclaim.ts` — Cron trigger (6h), auto-reclaim expired airdrops
- [x] `portfolio-aggregate.ts` — HTTP trigger, read balances across 3 chains
- [x] `stats-sync.ts` — Cron trigger (10min), aggregate protocol stats → MannaIndex

### Config Files
- [x] token-mint.workflow.yaml + config.staging.json
- [x] airdrop-reclaim.workflow.yaml + config.staging.json
- [x] portfolio-aggregate.workflow.yaml + config.staging.json
- [x] stats-sync.workflow.yaml + config.staging.json

### ABI Updates
- [x] Add MannaIndex, MannaToken.mint, eligibility ABIs to workflow/abi.ts

**Test Results:** 88/88 tests passing (9 new MannaIndex tests)

## Phase 7: Integration & Deployment (CRITICAL)

### Backend API Routes (MUST DO)
- [ ] `GET /api/launch/list` — read FairLaunch.getActiveLaunches()
- [ ] `GET /api/airdrop/eligibility` — call HumanDrop.isEligible()
- [ ] `POST /api/token/mint` — trigger token-mint.ts workflow
- [ ] `GET /api/portfolio` — trigger portfolio-aggregate.ts workflow
- [ ] `GET /api/stats` — read MannaIndex.getStats()
- [ ] `POST /api/staking/stake` — call StakingVault.stake()
- [ ] `POST /api/staking/unstake` — call StakingVault.unstake()
- [ ] `GET /api/staking/positions` — call StakingVault.getPositions()
- [ ] `POST /api/payouts/create` — call BatchPayout.distribute()
- [ ] `GET /api/payouts/history` — call BatchPayout.getPayouts()

### Frontend Integration (MUST DO)
- [ ] `/airdrops` — add eligibility check before claim
- [ ] `/fair-launch` — replace placeholder with real launch list + contribute
- [ ] `/utilities/token-mint` — add token deployment form
- [ ] `/staking` — wire to real StakingVault positions
- [ ] `/dashboards` — show live MannaIndex stats
- [ ] `/portfolio` — show multi-chain balances via CRE

### Auth & Security
- [ ] World App wallet auth — JWT session middleware
- [ ] `POST /api/auth/wallet` — create JWT from MiniKit.walletAuth()
- [ ] Protected route wrapper for all write operations

### Contract Deployment
- [ ] Deploy MannaIndex.sol to World Chain
- [ ] Deploy all contracts to Tenderly Virtual TestNet
- [ ] Set CRE operator addresses on all contracts
- [ ] Update all workflow config.staging.json with deployed addresses

### CRE Workflow Deployment
- [ ] Deploy token-mint.ts (HTTP trigger)
- [ ] Deploy airdrop-reclaim.ts (Cron 6h)
- [ ] Deploy portfolio-aggregate.ts (HTTP trigger)
- [ ] Deploy stats-sync.ts (Cron 10min)

## Phase 8: Submission
- [ ] Architecture docs / README
- [ ] Demo video (3-5 min)
- [ ] Submission form

---

## Resolved Questions
1. **Eligibility** → Open to all verified humans
2. **Architecture** → CRE-only (no CCIP)
3. **Amount** → Tiered (Orb gets more than Device)
4. **Multi-campaign** → Yes, multiple airdrops per contract
5. **Token** → Test ERC20 (HumanDropToken)
6. **Upgradeable** → No, immutable
