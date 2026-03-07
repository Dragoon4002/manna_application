# Manna App — Implementation Tracker

## Phase 0: Foundation
- [x] Copy ABIs from manna/ to manna_app/src/abi/
- [x] Add env vars (RPC, contract addresses, CRE URL, keys)
- [x] Create src/lib/contracts.ts (shared viem client)

## Phase 1: Airdrops (wire existing contracts)
- [x] GET /api/airdrop/list — port from manna/
- [x] POST /api/airdrop/create — port from manna/
- [x] POST /api/airdrop/claim — relay to CRE (+ debug mode)
- [x] GET /api/airdrop/eligibility — read hasClaimed
- [x] Wire /airdrops page to real data
- [x] AirdropCard component

## Phase 2: Staking (existing contract)
- [x] StakingVault.sol + tests (already existed, 10 tests pass)
- [x] Extract ABI from forge build
- [x] GET /api/staking/positions
- [x] POST /api/staking/stake (return MiniKit tx params)
- [x] POST /api/staking/unstake
- [x] POST /api/staking/claim-rewards
- [x] Wire /staking page (positions, lock periods, preset amounts)

## Phase 3: Payouts (existing contract)
- [x] BatchPayout.sol + tests (already existed, 13 tests pass)
- [x] Extract ABI from forge build
- [x] POST /api/payouts/create
- [x] GET /api/payouts/history
- [x] Build /payouts page (create form + history)

## Phase 4: Vesting (existing contract)
- [x] VestingVault.sol + tests (already existed)
- [x] Extract ABI from forge build
- [x] POST /api/vesting/create
- [x] POST /api/vesting/claim
- [x] POST /api/vesting/revoke
- [x] GET /api/vesting/schedules
- [x] Build /vesting page (tabs: schedules + create, progress bars)

## Phase 5: Polish
- [x] Wire /earn hub with live stats
- [x] DeployAll.s.sol script
- [x] Update .env.sample with all vars

## Verification
- [x] `forge test` — 38/38 tests pass (HumanDrop 15, StakingVault 10, BatchPayout 13)
- [x] `next build` — compiles clean, all 40 routes present
- [ ] Deploy with DeployAll.s.sol → fill .env.local addresses
- [ ] End-to-end test: create airdrop → list → claim
