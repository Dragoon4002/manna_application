# Manna App — Full Feature Spec

> Reference for all pages, contracts, API routes, CRE workflows. See CLAUDE.md for project architecture.

---

## Status Legend

- **Done** — UI + backend wired
- **UI Only** — frontend scaffolded, no backend
- **Placeholder** — coming soon page exists
- **TODO** — not started

---

## `/airdrops` — Airdrop Hub

### Create Airdrop
- CRE: `verify-world-wallet` → register creator on target chain → `AirdropVault.createAirdrop()`
- Contract: `AirdropVault.createAirdrop(token, amount, targetChain, recipientCount, expiry)`
- API: `POST /api/airdrop/create` → validate → trigger CRE → return airdropId
- **Status:** UI Only

### Claim Airdrop
- CRE: verify wallet → `hasClaimed()` check → `ClaimContract.claim()`
- Contract: `ClaimContract.claim(wallet, airdropId)` + `hasClaimed(wallet, airdropId)`
- API: `POST /api/airdrop/claim` → trigger CRE → poll tx hash → return result
- **Status:** UI Only

### View Active Airdrops
- Contract: `AirdropVault.getActiveAirdrops()` (on-chain read)
- API: `GET /api/airdrop/list` → read contract or indexed DB
- **Status:** UI Only

### Eligibility Check
- CRE: read wallet activity on target chain
- Contract: `AirdropVault.isEligible(wallet, airdropId)`
- API: `GET /api/airdrop/eligibility?wallet=&airdropId=`
- **Status:** TODO

---

## `/fair-launch` — Fair Token Launch

### Create Fair Launch
- CRE: verify creator on World Chain → deploy launch config on target chain
- Contract: `FairLaunch.create(token, hardCap, softCap, duration, maxPerWallet)`
- API: `POST /api/launch/create` → trigger CRE → return launchId
- **Status:** Placeholder

### Contribute to Launch
- CRE: verify contributor wallet → enforce `maxPerWallet` cross-chain
- Contract: `FairLaunch.contribute(launchId)` payable
- API: `POST /api/launch/contribute`
- **Status:** Placeholder

### Finalize / Distribute
- CRE: cron → check ended → `finalize()` → distribute or refund
- Contract: `FairLaunch.finalize(launchId)`
- **Status:** TODO

### Refund if Failed
- Contract: `FairLaunch.refund(launchId)` — callable if softcap missed after expiry
- API: `POST /api/launch/refund`
- **Status:** TODO

---

## `/utilities/token-mint` — Token Deployment

### Deploy New ERC20
- CRE: verify creator → deploy via `TokenFactory` on target chain
- Contract: `TokenFactory.deploy(name, symbol, supply, decimals, owner)`
- API: `POST /api/token/deploy` → trigger CRE → return address + tx hash
- **Status:** Placeholder

### Mint Additional Supply
- CRE: verify caller is token owner
- Contract: `MannaToken.mint(to, amount)` — owner-only
- API: `POST /api/token/mint`
- **Status:** TODO

---

## `/trade` — Token Swap

### Execute Swap
- Contract: DEX router `router.swapExactTokensForTokens()`
- API: `POST /api/trade/swap` → get quote → build tx → send via MiniKit
- **Status:** UI Only

### Get Swap Quote
- Contract: `router.getAmountsOut(amountIn, path)` — read only
- API: `GET /api/trade/quote?tokenIn=&tokenOut=&amount=`
- **Status:** TODO

### Cross-Chain Swap
- CRE: read liquidity on multiple chains → route → execute via CCIP bridge
- Contract: `CrossChainSwap.swap(tokenIn, tokenOut, targetChain, amount)`
- API: `POST /api/trade/cross-chain-swap`
- **Status:** TODO

---

## `/staking` — Stake Tokens

### Stake
- Contract: `StakingVault.stake(amount, lockPeriod)`
- API: `POST /api/staking/stake` → build tx → send via MiniKit
- **Status:** UI Only

### Unstake
- Contract: `StakingVault.unstake(positionId)` — checks lock expired
- API: `POST /api/staking/unstake`
- **Status:** TODO

### Claim Rewards
- CRE: optional cron for auto-compound
- Contract: `StakingVault.claimRewards(positionId)`
- API: `POST /api/staking/claim-rewards`
- **Status:** TODO

### View Positions
- Contract: `StakingVault.getPositions(wallet)` — read
- API: `GET /api/staking/positions?wallet=`
- **Status:** UI Only (demo data)

---

## `/vesting` — Vesting Schedules

### Create Vesting Schedule
- CRE: verify creator → deploy vesting config
- Contract: `VestingVault.create(recipient, token, amount, cliff, duration, revocable)`
- API: `POST /api/vesting/create`
- **Status:** Placeholder

### Claim Vested Tokens
- Contract: `VestingVault.claim(scheduleId)`
- API: `POST /api/vesting/claim`
- **Status:** TODO

### Revoke Schedule
- Contract: `VestingVault.revoke(scheduleId)` — creator only
- API: `POST /api/vesting/revoke`
- **Status:** TODO

---

## `/payouts` — Batch Distributions

### Create Payout
- CRE: verify sender → batch transfers on target chain
- Contract: `BatchPayout.distribute(token, recipients[], amounts[])`
- API: `POST /api/payouts/create` → trigger CRE batch workflow
- **Status:** Placeholder

### View Payout History
- Contract: `BatchPayout.getPayouts(wallet)`
- API: `GET /api/payouts/history?wallet=`
- **Status:** TODO

---

## `/escrow` — P2P Escrow

### Create Escrow
- CRE: verify both parties are World App wallets
- Contract: `Escrow.create(counterparty, token, amount, conditions, expiry)`
- API: `POST /api/escrow/create`
- **Status:** Placeholder

### Release Escrow
- Contract: `Escrow.release(escrowId)` — both parties confirm
- API: `POST /api/escrow/release`
- **Status:** TODO

### Dispute / Cancel
- Contract: `Escrow.cancel(escrowId)` — returns tokens if expired or mutual
- API: `POST /api/escrow/cancel`
- **Status:** TODO

---

## `/portfolio` + `/vault` + `/locks`

### View Portfolio
- CRE: aggregate balances across chains
- API: `GET /api/portfolio?wallet=`
- **Status:** Placeholder

### Vault Deposit/Withdraw
- Contract: `TokenVault.deposit(token, amount)` / `TokenVault.withdraw(token, amount)`
- API: `POST /api/vault/deposit` / `POST /api/vault/withdraw`
- **Status:** Placeholder

### Lock Tokens
- Contract: `TokenLocker.lock(token, amount, unlockTime)`
- API: `POST /api/locks/create`
- **Status:** Placeholder

---

## `/utilities/dust-collector`

### Sweep Dust
- CRE: read all balances → identify dust (< $1) → batch swap
- Contract: `DustCollector.sweep(tokens[], minValues[], targetToken)`
- API: `POST /api/utilities/dust-sweep`
- **Status:** Placeholder

---

## `/utilities/sybil-checker`

### Check Address
- CRE: read cross-chain tx history → compute sybil risk score
- API: `GET /api/utilities/sybil-check?address=`
- **Status:** Placeholder

---

## `/utilities/airdrop-checker`

### Check Eligibility
- CRE: read wallet on target chain → check criteria
- API: `GET /api/utilities/airdrop-check?wallet=`
- **Status:** Placeholder

---

## `/utilities/address-book`

### Manage Addresses
- Local storage or backend DB
- API: `GET/POST/DELETE /api/utilities/address-book`
- **Status:** Placeholder

---

## `/dashboards`

### Analytics
- CRE: cron → aggregate stats → write to index contract
- Contract: `MannaIndex.getStats()`
- API: `GET /api/dashboards/stats`
- **Status:** Placeholder

---

# CRE Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `verify-world-wallet` | HTTP | Read World Chain → verify wallet → register on target chain |
| `airdrop-claim` | HTTP | Verify → check eligibility → prevent double-claim → transfer |
| `token-deploy` | HTTP | Verify creator → deploy ERC20 via TokenFactory |
| `cross-chain-swap` | HTTP | Route swap across chains → execute via best venue |
| `fair-launch-finalize` | Cron | Check ended launches → distribute or refund |
| `batch-payout` | HTTP | Verify sender → multi-recipient transfers |
| `portfolio-aggregate` | HTTP | Read ERC20 balances on N chains → unified portfolio |
| `dust-sweep` | HTTP | Read dust → batch swap to target token |
| `sybil-score` | HTTP | Read cross-chain tx history → risk score |
| `dashboard-sync` | Cron | Aggregate stats → write to MannaIndex |
| `staking-auto-compound` | Cron | Claim + restake rewards automatically |

---

# Contracts

| Contract | Key Functions |
|---|---|
| `WorldWalletVerifier` | `registerWallet()`, `isRegistered()` |
| `AirdropVault` | `createAirdrop()`, `getActiveAirdrops()`, `isEligible()` |
| `ClaimContract` | `claim()`, `hasClaimed()` |
| `TokenFactory` | `deploy(name, symbol, supply, decimals, owner)` |
| `FairLaunch` | `create()`, `contribute()`, `finalize()`, `refund()` |
| `StakingVault` | `stake()`, `unstake()`, `claimRewards()`, `getPositions()` |
| `VestingVault` | `create()`, `claim()`, `revoke()` |
| `BatchPayout` | `distribute()`, `getPayouts()` |
| `Escrow` | `create()`, `release()`, `cancel()` |
| `TokenVault` | `deposit()`, `withdraw()` |
| `TokenLocker` | `lock()`, `unlock()` |
| `DustCollector` | `sweep()` |
| `MannaIndex` | `getStats()`, `updateStats()` |

---

# Backend API Routes

| Route | Method | CRE? | Purpose |
|---|---|---|---|
| `/api/auth/wallet` | POST | No | Wallet auth → JWT |
| `/api/airdrop/create` | POST | Yes | Create airdrop on target chain |
| `/api/airdrop/claim` | POST | Yes | Claim w/ double-claim protection |
| `/api/airdrop/list` | GET | No | Fetch active airdrops |
| `/api/airdrop/eligibility` | GET | Yes | Check wallet eligibility |
| `/api/token/deploy` | POST | Yes | Deploy ERC20 |
| `/api/token/mint` | POST | Yes | Mint supply |
| `/api/trade/quote` | GET | No | Swap quote |
| `/api/trade/swap` | POST | No | Execute swap |
| `/api/trade/cross-chain-swap` | POST | Yes | Cross-chain swap |
| `/api/staking/stake` | POST | No | Stake tokens |
| `/api/staking/unstake` | POST | No | Unstake |
| `/api/staking/claim-rewards` | POST | No | Claim rewards |
| `/api/staking/positions` | GET | No | Fetch positions |
| `/api/launch/create` | POST | Yes | Create fair launch |
| `/api/launch/contribute` | POST | Yes | Contribute |
| `/api/launch/refund` | POST | No | Refund failed launch |
| `/api/vesting/create` | POST | Yes | Create vesting |
| `/api/vesting/claim` | POST | No | Claim vested |
| `/api/vesting/revoke` | POST | No | Revoke schedule |
| `/api/payouts/create` | POST | Yes | Batch payout |
| `/api/payouts/history` | GET | No | Payout history |
| `/api/escrow/create` | POST | Yes | Create escrow |
| `/api/escrow/release` | POST | No | Release escrow |
| `/api/escrow/cancel` | POST | No | Cancel escrow |
| `/api/portfolio` | GET | Yes | Multi-chain portfolio |
| `/api/vault/deposit` | POST | No | Vault deposit |
| `/api/vault/withdraw` | POST | No | Vault withdraw |
| `/api/locks/create` | POST | No | Lock tokens |
| `/api/utilities/dust-sweep` | POST | Yes | Sweep dust |
| `/api/utilities/sybil-check` | GET | Yes | Sybil score |
| `/api/dashboards/stats` | GET | No | Protocol analytics |
| `/api/cre/webhook` | POST | — | CRE async callbacks |

---

# HumanID Verification Points

| Action | Check |
|---|---|
| Any write action | `session.worldAppWallet === true` (JWT middleware) |
| Create airdrop/launch/token | Wallet session + CRE World Chain verification |
| Claim airdrop | Wallet session + CRE `hasClaimed()` |
| Escrow creation | Both parties verified via CRE |
| Cross-chain actions | CRE re-verifies on World Chain before executing |
