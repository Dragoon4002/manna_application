# Fair Launch Finalize Workflow

Checks for ended token launches on all chains and auto-finalizes them by calling `FairLaunch.finalize()`. Distributes tokens if softcap met, enables refunds otherwise.

## Trigger

**Cron** -- runs every 5 minutes (`*/5 * * * *`).

## Config Keys (`fair-launch-finalize.config.staging.json`)

| Key | Description |
|-----|-------------|
| `fairLaunchWorldChain` | FairLaunch address on World Chain |
| `fairLaunchArbSepolia` | FairLaunch address on Arbitrum Sepolia |
| `fairLaunchBaseSepolia` | FairLaunch address on Base Sepolia |
| `schedule` | Cron schedule (`*/5 * * * *`) |

## Commands

```bash
# Simulate
cre workflow simulate ./fair-launch-finalize -T staging

# Deploy
cre workflow deploy ./fair-launch-finalize -T staging
```
