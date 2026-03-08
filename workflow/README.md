# CRE Workflows — Manna Protocol

8 Chainlink CRE workflows for sybil-resistant airdrops, token launches, staking, and protocol stats.

## Structure

Each workflow lives in its own folder with `workflow.yaml`, TypeScript entry, and staging config.

```
workflow/
├── claim/                  HTTP — Airdrop claim w/ World ID verification
├── airdrop-create/         HTTP — Create airdrops on HumanDrop
├── airdrop-reclaim/        Cron (6h) — Auto-reclaim expired airdrops
├── token-deploy/           HTTP — Deploy ERC20 via TokenFactory
├── token-mint/             HTTP — Mint additional token supply
├── fair-launch-finalize/   Cron (5min) — Auto-finalize ended launches
├── stats-sync/             Cron (10min) — Aggregate stats to MannaIndex
├── portfolio-aggregate/    HTTP — Read balances across 3 chains
├── package.json
└── tsconfig.json
```

Each folder has its own README with config keys and commands.

## Quick Start

```bash
cd workflow
bun install

# Simulate any workflow
cre workflow simulate ./claim -T staging
cre workflow simulate ./fair-launch-finalize -T staging

# Deploy
cre workflow deploy ./claim -T staging

# Set secrets (one-time)
cre secrets set --namespace humandrop --key WORLD_ID_API_KEY --value "your_key"
```

## Local Simulation (No CRE CLI Needed)

Two modes for testing without CRE staging URL:

### 1. Direct Contract Simulation

Runs all 8 workflows against Tenderly VNet using viem. Reads config from `manna_app/.env.local`.

```bash
bun run workflow/simulate.ts
```

Sequence: token-deploy -> token-mint -> airdrop-create -> claim -> fair-launch (create+contribute+finalize) -> portfolio-aggregate -> stats-sync -> airdrop-reclaim

### 2. API Integration Test

Tests same flows via Next.js API routes (requires dev server).

```bash
# Terminal 1
cd manna_app && npm run dev

# Terminal 2
bash workflow/simulate-api.sh
```

## CRE Simulate All

```bash
# HTTP triggers (need --http-payload)
cre workflow simulate ./claim -T staging \
  --http-payload '{"airdropId":0,"proof":{"merkle_root":"0x0","nullifier_hash":"0x0","proof":"0x0","verification_level":"orb"},"signal":"","action":"claim-airdrop"}'

cre workflow simulate ./airdrop-create -T staging \
  --http-payload '{"token":"0x...","amountOrb":"100","amountDevice":"50","maxClaims":1000,"expiryDays":30,"targetChain":"arbitrum-sepolia"}'

cre workflow simulate ./token-deploy -T staging \
  --http-payload '{"name":"TestToken","symbol":"TT","initialSupply":"1000000","decimals":18,"owner":"0x...","enableMinting":true,"targetChain":"arbitrum-sepolia"}'

cre workflow simulate ./token-mint -T staging \
  --http-payload '{"tokenAddress":"0x...","to":"0x...","amount":"1000000000000000000000","targetChain":"arbitrum-sepolia"}'

cre workflow simulate ./portfolio-aggregate -T staging \
  --http-payload '{"wallet":"0x...","tokens":[{"address":"0x...","symbol":"HDT","decimals":18}]}'

# Cron triggers (no payload)
cre workflow simulate ./fair-launch-finalize -T staging
cre workflow simulate ./airdrop-reclaim -T staging
cre workflow simulate ./stats-sync -T staging
```

## Deploy All

```bash
cre workflow deploy ./claim -T staging
cre workflow deploy ./airdrop-create -T staging
cre workflow deploy ./token-deploy -T staging
cre workflow deploy ./token-mint -T staging
cre workflow deploy ./portfolio-aggregate -T staging
cre workflow deploy ./fair-launch-finalize -T staging
cre workflow deploy ./airdrop-reclaim -T staging
cre workflow deploy ./stats-sync -T staging
```

## Post-Deploy

Each HTTP workflow returns a webhook URL. Set in `manna_app/.env.local`:
```bash
CRE_CLAIM_URL=https://cre.chain.link/workflows/<id>/triggers/http
CRE_TOKEN_MINT_URL=https://...
CRE_AIRDROP_CREATE_URL=https://...
CRE_TOKEN_DEPLOY_URL=https://...
CRE_PORTFOLIO_URL=https://...
```

## Chain Selectors

| Chain | Selector Key |
|-------|-------------|
| World Chain Sepolia | `ethereum-testnet-sepolia-worldchain-1` |
| Arbitrum Sepolia | `ethereum-testnet-sepolia-arbitrum-1` |
| Base Sepolia | `ethereum-testnet-sepolia-base-1` |

## Dependencies

```json
{
  "@chainlink/cre-sdk": "^1.0.9",
  "viem": "^2.34.0"
}
```

## Architecture

- **Stateless** — each trigger fires independent execution
- **BFT Consensus** — all writes use DON consensus via `Runtime`
- **Multi-chain** — single workflow handles 3 chains via chain selector routing
- **Confidential HTTP** — World ID API key stored in VaultDON enclave
- **Gas limits** — explicit per operation (500k-1M)
