# Token Mint Workflow

Mints additional supply of a MannaToken on the specified chain. Only works for tokens deployed with minting enabled.

## Trigger

**HTTP** -- receives POST with token address, amount, recipient, and target chain.

## Config Keys (`token-mint.config.staging.json`)

| Key | Description |
|-----|-------------|
| `mannaTokenWorldChain` | MannaToken address on World Chain |
| `mannaTokenArbSepolia` | MannaToken address on Arbitrum Sepolia |
| `mannaTokenBaseSepolia` | MannaToken address on Base Sepolia |
| `authorizedEVMAddress` | Authorized caller address |

## Commands

```bash
# Simulate
cre workflow simulate ./token-mint -T staging \
  --http-payload '{"chain":"arbSepolia","token":"0x...","amount":"1000000","to":"0x..."}'

# Deploy
cre workflow deploy ./token-mint -T staging
```
