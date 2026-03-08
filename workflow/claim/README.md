# Claim Workflow

Verifies a World ID ZK proof via confidential HTTP to the World ID Cloud API, then calls `HumanDrop.claim()` to distribute tokens and `WorldIDVerifier.registerHuman()` to register the human on-chain.

## Trigger

**HTTP** -- receives POST with proof, airdropId, nullifierHash, receiver, and verification level.

## Config Keys (`config.staging.json`)

| Key | Description |
|-----|-------------|
| `worldIdAppId` | World ID application ID |
| `humanDropAddress` | HumanDrop contract address |
| `worldIdVerifierAddress` | WorldIDVerifier contract address |

## Commands

```bash
# Simulate
cre workflow simulate ./claim -T staging \
  --http-payload '{"proof":"...","airdropId":"1","nullifierHash":"0x...","receiver":"0x...","level":"orb"}'

# Deploy
cre workflow deploy ./claim -T staging
```
