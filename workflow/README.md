# CRE Workflows — Token Launchpad

Production-ready Chainlink CRE workflows for multi-chain token deployment, fair launch finalization, and airdrop creation.

## Workflows

### 1. token-deploy (HTTP Trigger)
Deploys ERC20 tokens via TokenFactory on World Chain, Arbitrum Sepolia, or Base Sepolia.

**Request:**
```json
{
  "creator": "0x...",
  "name": "My Token",
  "symbol": "MTK",
  "initialSupply": "1000000000000000000000000",
  "decimals": 18,
  "enableMinting": true,
  "targetChain": "world-chain"
}
```

**Response:**
```json
{
  "success": true,
  "chain": "world-chain",
  "txHash": "0x...",
  "message": "Token deployed — parse logs for address"
}
```

**Simulate:**
```bash
cd workflow
cre workflow simulate token-deploy --target staging --workflow-file token-deploy.workflow.yaml
```

### 2. fair-launch-finalize (Cron Trigger, every 5 min)
Monitors FairLaunch contracts across all chains, finalizes ended launches.

**Cron:** `*/5 * * * *` (every 5 minutes)

**Response:**
```json
{
  "success": true,
  "finalized": 3
}
```

**Logic:**
- Reads `launchCount()` on each chain
- For each launch: checks `endTime < now && !finalized`
- Calls `finalize(launchId)` if conditions met
- Processes World Chain, Arb Sepolia, Base Sepolia in sequence

**Simulate:**
```bash
cre workflow simulate fair-launch-finalize --target staging --workflow-file fair-launch-finalize.workflow.yaml
```

### 3. airdrop-create (HTTP Trigger)
Creates tiered airdrops on HumanDrop contracts across chains.

**Request:**
```json
{
  "creator": "0x...",
  "token": "0x...",
  "amountOrb": "100000000000000000000",
  "amountDevice": "50000000000000000000",
  "maxClaims": "1000",
  "expiry": "1735689600",
  "targetChain": "arbitrum-sepolia"
}
```

**Response:**
```json
{
  "success": true,
  "chain": "arbitrum-sepolia",
  "txHash": "0x...",
  "message": "Airdrop created — parse logs for airdropId"
}
```

**Simulate:**
```bash
cre workflow simulate airdrop-create --target staging --workflow-file airdrop-create.workflow.yaml
```

## Configuration

Before simulation/deployment, update config files with deployed contract addresses:

**token-deploy.config.staging.json**
```json
{
  "tokenFactoryWorldChain": "0x...",
  "tokenFactoryArbSepolia": "0x...",
  "tokenFactoryBaseSepolia": "0x...",
  "authorizedEVMAddress": "0x..."
}
```

**fair-launch-finalize.config.staging.json**
```json
{
  "fairLaunchWorldChain": "0x...",
  "fairLaunchArbSepolia": "0x...",
  "fairLaunchBaseSepolia": "0x...",
  "schedule": "*/5 * * * *"
}
```

**airdrop-create.config.staging.json**
```json
{
  "humanDropWorldChain": "0x...",
  "humanDropArbSepolia": "0xCeb84dD00cb5492b70D8c37D96701D36B72E7c70",
  "humanDropBaseSepolia": "0x...",
  "authorizedEVMAddress": "0x..."
}
```

## Chain Selectors

| Chain | Selector Key |
|-------|-------------|
| World Chain Sepolia | `ethereum-testnet-sepolia-worldchain-1` |
| Arbitrum Sepolia | `ethereum-testnet-sepolia-arbitrum-1` |
| Base Sepolia | `ethereum-testnet-sepolia-base-1` |

## Error Handling

All workflows use descriptive error prefixes:
- `INVALID_CHAIN:` — unsupported targetChain
- `TOKEN_DEPLOY_FAILED:` — TokenFactory.deployToken tx failed
- `AIRDROP_CREATE_FAILED:` — HumanDrop.createAirdrop tx failed
- `FINALIZE_FAILED:` — FairLaunch.finalize tx failed (logged, not thrown)

## Gas Limits

| Operation | Gas Limit |
|-----------|-----------|
| deployToken | 1,000,000 |
| finalize | 500,000 |
| createAirdrop | 500,000 |

## Deployment

1. **Simulate locally:**
   ```bash
   bun install
   cre workflow simulate <workflow-name> --target staging --workflow-file <workflow>.workflow.yaml
   ```

2. **Deploy to CRE:**
   ```bash
   cre workflow deploy <workflow-name> --target staging --workflow-file <workflow>.workflow.yaml
   ```

3. **Monitor:**
   ```bash
   cre workflow logs <workflow-name> --target staging
   ```

## Architecture Notes

- **Stateless:** Each trigger fires independent execution, no state persists
- **BFT Consensus:** All EVMClient write operations use DON consensus (Runtime)
- **Multi-chain:** Single workflow handles 3 chains via chain selector routing
- **Gas Safety:** All writes include explicit gas limits
- **Error Propagation:** HTTP workflows throw errors with prefixes for backend parsing
- **Cron Resilience:** fair-launch-finalize logs errors per chain, continues processing others

## Files

```
workflow/
├── abi.ts                                    # Shared ABI fragments
├── token-deploy.ts                           # HTTP: deploy tokens
├── token-deploy.config.staging.json
├── token-deploy.workflow.yaml
├── fair-launch-finalize.ts                   # Cron: finalize ended launches
├── fair-launch-finalize.config.staging.json
├── fair-launch-finalize.workflow.yaml
├── airdrop-create.ts                         # HTTP: create airdrops
├── airdrop-create.config.staging.json
├── airdrop-create.workflow.yaml
└── main.ts                                   # HTTP: airdrop claim (existing)
```

## Dependencies

```json
{
  "@chainlink/cre-sdk": "^1.0.9",
  "viem": "^2.34.0"
}
```

## Testing

Run local simulation with test payloads:

**token-deploy:**
```bash
echo '{"creator":"0x1234...","name":"Test","symbol":"TST","initialSupply":"1000000000000000000000000","decimals":18,"enableMinting":true,"targetChain":"arbitrum-sepolia"}' | cre workflow simulate token-deploy --target staging --stdin
```

**airdrop-create:**
```bash
echo '{"creator":"0x1234...","token":"0xABC...","amountOrb":"100000000000000000000","amountDevice":"50000000000000000000","maxClaims":"1000","expiry":"1735689600","targetChain":"arbitrum-sepolia"}' | cre workflow simulate airdrop-create --target staging --stdin
```

**fair-launch-finalize:**
Cron triggers automatically — no manual input needed.
