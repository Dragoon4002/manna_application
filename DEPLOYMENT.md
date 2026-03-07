# Deployment Guide — Manna Protocol

Complete deployment sequence for contracts + CRE workflows.

---

## Prerequisites

- Foundry installed (`forge`, `cast`)
- Bun or Node.js 18+ (for CRE workflows)
- Private key with testnet ETH on World Chain, Arb Sepolia, Base Sepolia
- CRE CLI installed (`npm i -g @chainlink/cre-cli`)

---

## 1. Contract Deployment

### Deploy to World Chain Testnet

```bash
cd contracts

# Set environment variables
export PRIVATE_KEY=0x...
export WORLD_CHAIN_RPC=https://worldchain-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deploy all contracts
forge script script/Deploy.s.sol \
  --rpc-url $WORLD_CHAIN_RPC \
  --broadcast \
  --verify

# Save deployed addresses from output
# Expected output:
# MannaIndex: 0x...
# HumanDrop: 0x...
# FairLaunch: 0x...
# TokenFactory: 0x...
# StakingVault: 0x...
# VestingVault: 0x...
# BatchPayout: 0x...
# WorldIDVerifier: 0x...
```

### Deploy to Arbitrum Sepolia

```bash
export ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc

forge script script/Deploy.s.sol \
  --rpc-url $ARB_SEPOLIA_RPC \
  --broadcast \
  --verify
```

### Deploy to Base Sepolia

```bash
export BASE_SEPOLIA_RPC=https://sepolia.base.org

forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

---

## 2. Update Config Files

After deployment, update all workflow configs with deployed addresses:

### `workflow/config.staging.json`

```json
{
  "worldIdAppId": "app_staging_...",
  "humanDropAddress": "0x_DEPLOYED_HUMANDROP_ARB_SEPOLIA",
  "worldIdVerifierAddress": "0x_DEPLOYED_VERIFIER_ARB_SEPOLIA"
}
```

### `workflow/token-mint.config.staging.json`

```json
{
  "mannaTokenWorldChain": "0x_DEPLOYED_TOKEN_WORLD_CHAIN",
  "mannaTokenArbSepolia": "0x_DEPLOYED_TOKEN_ARB_SEPOLIA",
  "mannaTokenBaseSepolia": "0x_DEPLOYED_TOKEN_BASE_SEPOLIA",
  "authorizedEVMAddress": "0x53cFeeFE7F47deAc4e89E45D9B1C5856Bd03eF9F"
}
```

### `workflow/airdrop-reclaim.config.staging.json`

```json
{
  "humanDropWorldChain": "0x_DEPLOYED_HUMANDROP_WORLD_CHAIN",
  "humanDropArbSepolia": "0x_DEPLOYED_HUMANDROP_ARB_SEPOLIA",
  "humanDropBaseSepolia": "0x_DEPLOYED_HUMANDROP_BASE_SEPOLIA",
  "schedule": "0 */6 * * *"
}
```

### `workflow/portfolio-aggregate.config.staging.json`

```json
{
  "authorizedEVMAddress": "0x53cFeeFE7F47deAc4e89E45D9B1C5856Bd03eF9F"
}
```

### `workflow/stats-sync.config.staging.json`

```json
{
  "humanDropWorldChain": "0x_DEPLOYED_HUMANDROP_WORLD_CHAIN",
  "humanDropArbSepolia": "0x_DEPLOYED_HUMANDROP_ARB_SEPOLIA",
  "humanDropBaseSepolia": "0x_DEPLOYED_HUMANDROP_BASE_SEPOLIA",
  "fairLaunchWorldChain": "0x_DEPLOYED_FAIRLAUNCH_WORLD_CHAIN",
  "fairLaunchArbSepolia": "0x_DEPLOYED_FAIRLAUNCH_ARB_SEPOLIA",
  "fairLaunchBaseSepolia": "0x_DEPLOYED_FAIRLAUNCH_BASE_SEPOLIA",
  "mannaIndexWorldChain": "0x_DEPLOYED_MANNAINDEX_WORLD_CHAIN",
  "schedule": "*/10 * * * *"
}
```

### `workflow/fair-launch-finalize.config.staging.json`

```json
{
  "fairLaunchWorldChain": "0x_DEPLOYED_FAIRLAUNCH_WORLD_CHAIN",
  "fairLaunchArbSepolia": "0x_DEPLOYED_FAIRLAUNCH_ARB_SEPOLIA",
  "fairLaunchBaseSepolia": "0x_DEPLOYED_FAIRLAUNCH_BASE_SEPOLIA",
  "schedule": "*/5 * * * *"
}
```

### `workflow/airdrop-create.config.staging.json`

```json
{
  "humanDropWorldChain": "0x_DEPLOYED_HUMANDROP_WORLD_CHAIN",
  "humanDropArbSepolia": "0x_DEPLOYED_HUMANDROP_ARB_SEPOLIA",
  "humanDropBaseSepolia": "0x_DEPLOYED_HUMANDROP_BASE_SEPOLIA",
  "authorizedEVMAddress": "0x53cFeeFE7F47deAc4e89E45D9B1C5856Bd03eF9F"
}
```

### `workflow/token-deploy.config.staging.json`

```json
{
  "tokenFactoryWorldChain": "0x_DEPLOYED_TOKENFACTORY_WORLD_CHAIN",
  "tokenFactoryArbSepolia": "0x_DEPLOYED_TOKENFACTORY_ARB_SEPOLIA",
  "tokenFactoryBaseSepolia": "0x_DEPLOYED_TOKENFACTORY_BASE_SEPOLIA",
  "authorizedEVMAddress": "0x53cFeeFE7F47deAc4e89E45D9B1C5856Bd03eF9F"
}
```

---

## 3. Set CRE Operator on Contracts

After deploying CRE workflows, set the CRE operator address on all contracts:

```bash
# Get CRE operator address from workflow deployment output
export CRE_OPERATOR=0x_CRE_CONSENSUS_ADDRESS

# Set operator on all contracts (repeat for each chain)
cast send $HUMANDROP_ADDRESS \
  "setOperator(address,bool)" \
  $CRE_OPERATOR \
  true \
  --rpc-url $WORLD_CHAIN_RPC \
  --private-key $PRIVATE_KEY

cast send $FAIRLAUNCH_ADDRESS \
  "setOperator(address,bool)" \
  $CRE_OPERATOR \
  true \
  --rpc-url $WORLD_CHAIN_RPC \
  --private-key $PRIVATE_KEY

cast send $TOKENFACTORY_ADDRESS \
  "setOperator(address,bool)" \
  $CRE_OPERATOR \
  true \
  --rpc-url $WORLD_CHAIN_RPC \
  --private-key $PRIVATE_KEY

cast send $MANNAINDEX_ADDRESS \
  "setOperator(address,bool)" \
  $CRE_OPERATOR \
  true \
  --rpc-url $WORLD_CHAIN_RPC \
  --private-key $PRIVATE_KEY

# Repeat for Arb Sepolia and Base Sepolia
```

---

## 4. Deploy CRE Workflows

### Install Dependencies

```bash
cd workflow
bun install
```

### Simulate Workflows Locally (Test First)

```bash
# Test main claim workflow
cre workflow simulate \
  --workflow-path ./main.ts \
  --config-path ./config.staging.json

# Test token mint
cre workflow simulate \
  --workflow-path ./token-mint.ts \
  --config-path ./token-mint.config.staging.json

# Test airdrop reclaim
cre workflow simulate \
  --workflow-path ./airdrop-reclaim.ts \
  --config-path ./airdrop-reclaim.config.staging.json

# Test portfolio aggregate
cre workflow simulate \
  --workflow-path ./portfolio-aggregate.ts \
  --config-path ./portfolio-aggregate.config.staging.json

# Test stats sync
cre workflow simulate \
  --workflow-path ./stats-sync.ts \
  --config-path ./stats-sync.config.staging.json
```

### Deploy to CRE Network

```bash
# Deploy main claim workflow
cre workflow deploy \
  --workflow-file ./main.workflow.yaml \
  --environment staging

# Deploy token mint
cre workflow deploy \
  --workflow-file ./token-mint.workflow.yaml \
  --environment staging

# Deploy airdrop reclaim (cron)
cre workflow deploy \
  --workflow-file ./airdrop-reclaim.workflow.yaml \
  --environment staging

# Deploy portfolio aggregate
cre workflow deploy \
  --workflow-file ./portfolio-aggregate.workflow.yaml \
  --environment staging

# Deploy stats sync (cron)
cre workflow deploy \
  --workflow-file ./stats-sync.workflow.yaml \
  --environment staging

# Deploy fair launch finalize (cron)
cre workflow deploy \
  --workflow-file ./fair-launch-finalize.workflow.yaml \
  --environment staging

# Deploy airdrop create
cre workflow deploy \
  --workflow-file ./airdrop-create.workflow.yaml \
  --environment staging

# Deploy token deploy
cre workflow deploy \
  --workflow-file ./token-deploy.workflow.yaml \
  --environment staging
```

### Set VaultDON Secrets (for World ID API)

```bash
# Set World ID API key secret
cre secrets set \
  --namespace humandrop \
  --key WORLD_ID_API_KEY \
  --value "your_world_id_api_key"
```

---

## 5. Update Frontend Env Vars

Update `manna_app/.env.local`:

```bash
# Chain RPCs
NEXT_PUBLIC_WORLD_CHAIN_RPC=https://worldchain-sepolia.g.alchemy.com/v2/...
NEXT_PUBLIC_ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org

# Contract Addresses (Arb Sepolia - default chain)
NEXT_PUBLIC_HUMANDROP_ADDRESS=0x_DEPLOYED_HUMANDROP_ARB_SEPOLIA
NEXT_PUBLIC_FAIRLAUNCH_ADDRESS=0x_DEPLOYED_FAIRLAUNCH_ARB_SEPOLIA
NEXT_PUBLIC_TOKENFACTORY_ADDRESS=0x_DEPLOYED_TOKENFACTORY_ARB_SEPOLIA
NEXT_PUBLIC_STAKINGVAULT_ADDRESS=0x_DEPLOYED_STAKINGVAULT_ARB_SEPOLIA
NEXT_PUBLIC_BATCHPAYOUT_ADDRESS=0x_DEPLOYED_BATCHPAYOUT_ARB_SEPOLIA
NEXT_PUBLIC_MANNAINDEX_ADDRESS=0x_DEPLOYED_MANNAINDEX_WORLD_CHAIN

# CRE Workflow URLs (from deployment output)
CRE_CLAIM_WORKFLOW_URL=https://...
CRE_TOKEN_MINT_URL=https://...
CRE_PORTFOLIO_URL=https://...
CRE_AIRDROP_CREATE_URL=https://...
CRE_TOKEN_DEPLOY_URL=https://...

# World ID
NEXT_PUBLIC_WORLD_ID_APP_ID=app_staging_...
```

---

## 6. Verify Deployment

### Test Contracts

```bash
cd contracts

# Verify operator is set
cast call $HUMANDROP_ADDRESS \
  "operators(address)(bool)" \
  $CRE_OPERATOR \
  --rpc-url $WORLD_CHAIN_RPC

# Expected: true (0x0000...0001)
```

### Test CRE Workflows

```bash
# Trigger HTTP workflow via curl
curl -X POST $CRE_CLAIM_WORKFLOW_URL \
  -H "Content-Type: application/json" \
  -d '{
    "airdropId": 0,
    "proof": {
      "merkle_root": "0x...",
      "nullifier_hash": "0x...",
      "proof": "0x...",
      "verification_level": "orb"
    },
    "signal": "0x...",
    "action": "claim-airdrop"
  }'

# Check CRE logs
cre workflow logs --workflow-id <workflow_id>
```

### Test Frontend

```bash
cd manna_app
npm run dev

# Open http://localhost:3000
# Navigate to /airdrops
# Verify contract data loads
```

---

## 7. Deployment Checklist

- [ ] All contracts deployed to 3 chains (World Chain, Arb Sepolia, Base Sepolia)
- [ ] All workflow config files updated with deployed addresses
- [ ] CRE operator set on all contracts
- [ ] All 8 CRE workflows deployed
- [ ] VaultDON secrets configured (World ID API key)
- [ ] Frontend env vars updated
- [ ] Contracts verified on block explorers
- [ ] Workflows tested via simulation
- [ ] E2E flow tested (claim airdrop via Mini App)

---

## Troubleshooting

### Contract Deployment Fails
- Check private key has testnet ETH on target chain
- Verify RPC URL is correct
- Check Foundry version: `forge --version` (should be ≥0.2.0)

### CRE Workflow Simulation Fails
- Run `bun install` in workflow directory
- Check TypeScript compilation: `bun run tsc --noEmit`
- Verify config.staging.json has valid addresses

### CRE Deployment Fails
- Check CRE CLI version: `cre --version`
- Verify workflow.yaml syntax
- Check network connectivity

### Operator Not Set
- Verify CRE operator address from deployment logs
- Re-run `cast send` commands with correct operator address
- Check transaction succeeded on block explorer

---

## Next Steps

After deployment:
1. Build API routes (see `API_SPEC.md`)
2. Wire frontend to real contract data
3. Add World App auth middleware
4. E2E test full claim flow
5. Record demo video
