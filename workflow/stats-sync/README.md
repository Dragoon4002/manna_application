# Stats Sync Workflow

Aggregates protocol stats (total airdrops, launches, users, volume) from HumanDrop and FairLaunch contracts across all chains, then writes the totals to MannaIndex.

## Trigger

**Cron** -- runs every 10 minutes (`*/10 * * * *`).

## Config Keys (`stats-sync.config.staging.json`)

| Key | Description |
|-----|-------------|
| `humanDropWorldChain` | HumanDrop address on World Chain |
| `humanDropArbSepolia` | HumanDrop address on Arbitrum Sepolia |
| `humanDropBaseSepolia` | HumanDrop address on Base Sepolia |
| `fairLaunchWorldChain` | FairLaunch address on World Chain |
| `fairLaunchArbSepolia` | FairLaunch address on Arbitrum Sepolia |
| `fairLaunchBaseSepolia` | FairLaunch address on Base Sepolia |
| `mannaIndexWorldChain` | MannaIndex address on World Chain |
| `schedule` | Cron schedule (`*/10 * * * *`) |

## Commands

```bash
# Simulate
cre workflow simulate ./stats-sync -T staging

# Deploy
cre workflow deploy ./stats-sync -T staging
```
