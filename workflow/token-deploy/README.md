# Token Deploy Workflow

Deploys a new ERC20 token via the TokenFactory contract on the specified chain. Supports custom name, symbol, supply, decimals, and optional minting.

## Trigger

**HTTP** -- receives POST with token parameters and target chain.

## Config Keys (`token-deploy.config.staging.json`)

| Key | Description |
|-----|-------------|
| `tokenFactoryWorldChain` | TokenFactory address on World Chain |
| `tokenFactoryArbSepolia` | TokenFactory address on Arbitrum Sepolia |
| `tokenFactoryBaseSepolia` | TokenFactory address on Base Sepolia |
| `authorizedEVMAddress` | Authorized caller address |

## Commands

```bash
# Simulate
cre workflow simulate ./token-deploy -T staging \
  --http-payload '{"chain":"arbSepolia","name":"MyToken","symbol":"MTK","initialSupply":"1000000","decimals":"18","enableMinting":true}'

# Deploy
cre workflow deploy ./token-deploy -T staging
```
