# Airdrop Reclaim Workflow

Automatically reclaims unclaimed tokens from expired airdrops by calling `HumanDrop.withdraw()` on all supported chains.

## Trigger

**Cron** -- runs every 6 hours (`0 */6 * * *`).

## Config Keys (`airdrop-reclaim.config.staging.json`)

| Key | Description |
|-----|-------------|
| `humanDropWorldChain` | HumanDrop address on World Chain |
| `humanDropArbSepolia` | HumanDrop address on Arbitrum Sepolia |
| `humanDropBaseSepolia` | HumanDrop address on Base Sepolia |
| `schedule` | Cron schedule (`0 */6 * * *`) |

## Commands

```bash
# Simulate
cre workflow simulate ./airdrop-reclaim -T staging

# Deploy
cre workflow deploy ./airdrop-reclaim -T staging
```
