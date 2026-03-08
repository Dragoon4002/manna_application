# Portfolio Aggregate Workflow

Reads token balances, staking positions, and vesting schedules for a wallet across 3 chains (World Chain, Arbitrum Sepolia, Base Sepolia) and returns a unified portfolio view.

## Trigger

**HTTP** -- receives POST with the wallet address to query.

## Config Keys (`portfolio-aggregate.config.staging.json`)

| Key | Description |
|-----|-------------|
| `authorizedEVMAddress` | Authorized caller address |

## Commands

```bash
# Simulate
cre workflow simulate ./portfolio-aggregate -T staging \
  --http-payload '{"wallet":"0x..."}'

# Deploy
cre workflow deploy ./portfolio-aggregate -T staging
```
