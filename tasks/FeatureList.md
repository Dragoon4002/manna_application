## Project: HumanDrop

> *Sybil-resistant cross-chain token distribution powered by verified humans*

---

## Must Have (Track Requirements — ship or disqualify)

### World ID + CRE Track
- [ ] World ID verification flow in Mini App using `MiniKit.commandsAsync.verify()`
- [ ] CRE workflow that receives World ID ZK proof
- [ ] CRE verifies proof via HTTPClient call to World ID Cloud API (`POST /api/v2/verify/{app_id}`)
- [ ] CRE writes verification result to a chain where World ID is NOT natively supported (Arbitrum or Base)
- [ ] `WorldIDVerifier` contract on target chain storing `nullifierHash → verified` mapping
- [ ] Any external dApp can call `isVerifiedHuman(nullifierHash)` on that contract (public good)
- [ ] Nullifier hash used for double-claim prevention (one human = one claim per airdrop)

### World Mini App + CRE Track
- [ ] App scaffolded as a World Mini App (runs in World App WebView)
- [ ] MiniKit SDK integrated and initialized (`MiniKitProvider`)
- [ ] At least one MiniKit command used beyond verify (e.g., `walletAuth` or `pay`)
- [ ] Mini App backend calls CRE workflow via HTTP Trigger
- [ ] CRE reads data from a non-World Chain (Arbitrum/Base) — proving Mini App extends beyond World Chain
- [ ] CRE writes to a non-World Chain — proving cross-chain execution
- [ ] Result from CRE surfaces back in Mini App UI (claim confirmation, tx hash)

### Tenderly Track
- [ ] Tenderly Virtual TestNet created (forked from Arbitrum mainnet)
- [ ] All smart contracts deployed on Virtual TestNet (`AirdropVault`, `ClaimContract`, `WorldIDVerifier`)
- [ ] Transaction history visible in Tenderly Explorer
- [ ] Tenderly Explorer link included in submission
- [ ] CRE workflow simulated against Virtual TestNet RPC endpoint
- [ ] GitHub repo contains: CRE workflows, smart contracts, deployment scripts
- [ ] Architecture documentation: use case, system design, how CRE + Tenderly work together

### DeFi & Tokenization Track
- [ ] CRE workflow that integrates at least one blockchain + one external system (World ID API)
- [ ] Successful CRE CLI simulation OR live CRE deployment
- [ ] 3-5 min public video showing workflow execution
- [ ] Public GitHub repo
- [ ] README linking all Chainlink/CRE files

### Submission Artifacts
- [ ] Project name + one-liner description
- [ ] Full description (what, how, problem solved)
- [ ] Architecture explanation
- [ ] Challenges faced
- [ ] Repo link
- [ ] Direct link to CRE/Chainlink code files
- [ ] Demo video link (<5 min)
- [ ] Track selections

---

## Needed (Connects everything into a coherent product)

### Claim Flow (the core product loop)
- [ ] Airdrop discovery screen — list of active airdrops with token name, amount, chain, expiry, claims remaining
- [ ] `AirdropIndex` contract on World Chain — stores metadata for all active airdrops (Mini App reads this)
- [ ] Claim button triggers World ID verify → CRE workflow → token distribution → confirmation screen
- [ ] Claim status tracking — "pending" → "verifying" → "distributing" → "claimed" with loading states
- [ ] Confirmation screen showing: tokens received, target chain, tx hash (linked to explorer)
- [ ] Double-claim rejection — if user already claimed, show "Already claimed" instead of claim button

### Creator Flow (makes it a product, not just a claim page)
- [ ] Web dashboard (separate from Mini App) where project creators set up airdrops
- [ ] Form: token address, total amount, eligibility type, target chain, expiry
- [ ] Token approval + deposit into `AirdropVault` contract
- [ ] `AirdropVault.createAirdrop()` emits event → backend indexes → appears in Mini App
- [ ] Three eligibility modes:
  - Open to all verified humans (simplest)
  - Merkle root upload (creator provides CSV of eligible addresses)
  - Onchain rule (e.g., must hold ≥X token on chain Y) — CRE scans and generates merkle root

### Smart Contracts (minimum set)
- [ ] `AirdropVault` — holds tokens, stores airdrop config, releases tokens on valid CRE report
- [ ] `ClaimContract` — receives CRE signed report, verifies signature, transfers tokens, stores nullifier to prevent double-claim
- [ ] `WorldIDVerifier` — stores CRE-bridged World ID verification results, exposes `isVerifiedHuman()`
- [ ] `AirdropIndex` (World Chain) — registry of all airdrops for Mini App to read

### CRE Workflows (minimum set)
- [ ] `verify-and-claim` (HTTP Trigger) — the main workflow: verify World ID → check eligibility → check double-claim → distribute tokens → register human on target chain
- [ ] Config file with chain selectors, contract addresses, World ID app_id
- [ ] Secrets management for World ID API credentials

### Backend
- [ ] `/api/airdrops` — returns active airdrops (reads from AirdropIndex or local cache)
- [ ] `/api/claim` — receives World ID proof from Mini App → forwards to CRE HTTP Trigger → returns result
- [ ] `/api/airdrop/create` — processes creator form, deploys airdrop to vault
- [ ] JWT signing for CRE HTTP Trigger authentication

---

## Optional (Feel-good UX — makes it polished and usable)

### Mini App UX
- [ ] Airdrop cards with token logos, progress bars (847/1000 claimed), countdown timers
- [ ] Chain badges (shows which chain the airdrop is on — Arbitrum logo, Base logo, etc.)
- [ ] "My Claims" history page — list of all airdrops user has claimed with tx links
- [ ] Skeleton loading states while CRE workflow executes (can take 10-30 seconds)
- [ ] Error handling with human-readable messages ("This airdrop has expired", "You don't meet eligibility requirements", "Already claimed")
- [ ] Haptic feedback on claim success via `MiniKit.commandsAsync.sendHapticFeedback()`
- [ ] Push notification when new airdrop matching your profile goes live via `MiniKit.commandsAsync.sendNotification()`
- [ ] Localization — Spanish, Portuguese, Japanese (World's top user regions)

### Creator Dashboard UX
- [ ] Real-time claim counter (updates as humans claim)
- [ ] Map or chart showing claim distribution by verification level (Orb vs Device vs Document)
- [ ] "Sybil savings" metric — shows estimated bot claims prevented (e.g., "842 human claims, est. 3,200+ bot claims blocked")
- [ ] Export claim data as CSV (nullifier hashes, wallets, timestamps)
- [ ] Airdrop templates — "Quick drop to all humans" vs "Targeted to token holders" vs "Custom merkle"

### Monitoring CRE Workflow
- [ ] `airdrop-monitor` (Cron Trigger, every 5 min) — reads claim counts across chains → updates `AirdropIndex` stats on World Chain
- [ ] Tracks: total claims, remaining tokens, unique humans, time remaining
- [ ] Powers the progress bars and stats in Mini App without on-demand queries

### Smart Contract Extras
- [ ] Airdrop expiry — unclaimed tokens returnable to creator after deadline
- [ ] Pausable — creator can pause/resume an airdrop
- [ ] Multi-token support — single airdrop can distribute multiple tokens

---

## Not So Needed (Charm features — extend the platform)

### Cross-Chain Expansion
- [ ] Support 5+ target chains (Arbitrum, Base, Polygon, Optimism, Avalanche)
- [ ] Chain-agnostic claiming — user picks which chain they want tokens on
- [ ] Cross-chain airdrop — single campaign distributes across multiple chains simultaneously

### Advanced Eligibility
- [ ] CRE `eligibility-scanner` workflow (HTTP Trigger) — reads balances/NFTs across multiple chains → generates merkle tree → writes root to AirdropVault
- [ ] Tiered airdrops — different amounts based on verification level (Orb gets 2x vs Device)
- [ ] Activity-based eligibility — "must have done ≥5 swaps on Uniswap in last 30 days" (CRE reads onchain history)
- [ ] Composable eligibility — AND/OR rules ("holds NFT X on Ethereum AND ≥100 USDC on Arbitrum")

### Social / Viral Features
- [ ] Referral system — verified human shares claim link → gets bonus tokens when referee claims
- [ ] Leaderboard — "Top verified communities claiming this drop"
- [ ] Share card — generates image card "I claimed 100 TEST tokens as a verified human" for sharing

### Public Good: Human Registry
- [ ] `WorldIDVerifier` becomes a reusable public good on each chain
- [ ] Any protocol on Arbitrum/Base can call `isVerifiedHuman()` for their own sybil resistance
- [ ] Registry grows with every airdrop claim — network effect
- [ ] Documentation for other devs to integrate

### AI Features (strengthens CRE & AI track if you add it)
- [ ] AI-powered eligibility suggestions — creator describes target audience in natural language → AI generates onchain eligibility rules
- [ ] Fraud pattern detection — AI analyzes claim patterns to flag suspicious activity (even if World ID verified, behavior might be bot-like)
- [ ] Airdrop ROI estimator — AI predicts claim rate based on eligibility criteria and historical data

### Advanced Tenderly Integration
- [ ] Fork from multiple chains simultaneously (Arbitrum + Base + Polygon)
- [ ] Simulate attack scenarios — show what happens if someone tries to claim twice, or with invalid proof
- [ ] Gas estimation dashboard from Tenderly's simulation data
- [ ] Automated test suite running on Virtual TestNet via CI/CD

---

## Priority Build Order

```
Week 1 (Days 1-5): Foundation
├── Day 1: Scaffold Mini App + backend + Tenderly Virtual TestNet
├── Day 2: Smart contracts (AirdropVault, ClaimContract, WorldIDVerifier)
├── Day 3: Deploy contracts to Tenderly, write CRE verify-and-claim workflow
├── Day 4: Connect Mini App → backend → CRE → contracts (full claim flow)
├── Day 5: World ID integration in Mini App + CRE proof verification

Week 2 (Days 6-9): Product + Polish
├── Day 6: Creator dashboard (airdrop creation flow)
├── Day 7: AirdropIndex + discovery feed in Mini App
├── Day 8: Optional UX (loading states, error handling, haptics, claim history)
├── Day 9: Monitoring workflow + stats display

Day 10: Submission
├── Architecture documentation
├── README with Chainlink file links
├── Tenderly Explorer link verification
├── Record 3-5 min demo video
├── Write submission description
```
