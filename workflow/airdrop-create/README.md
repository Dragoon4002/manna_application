# Airdrop Create Workflow

Creates a new airdrop on the HumanDrop contract across supported chains. Accepts token address, amounts, max claims, and expiry via HTTP payload.

## Trigger

**HTTP** -- receives POST with airdrop parameters and target chain.

## Config Keys (`airdrop-create.config.staging.json`)

| Key | Description |
|-----|-------------|
| `humanDropWorldChain` | HumanDrop address on World Chain |
| `humanDropArbSepolia` | HumanDrop address on Arbitrum Sepolia |
| `humanDropBaseSepolia` | HumanDrop address on Base Sepolia |
| `authorizedEVMAddress` | Authorized caller address |

## Commands

```bash
# Simulate
cre workflow simulate ./airdrop-create -T staging \
  --http-payload '{"chain":"arbSepolia","token":"0x...","amountOrb":"100","amountDevice":"50","maxClaims":"1000","expiry":"1720000000"}'

# Deploy
cre workflow deploy ./airdrop-create -T staging
```
