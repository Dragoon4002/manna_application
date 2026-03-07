# CRE Workflows Implementation Summary

## What Was Built

Three production-ready Chainlink CRE workflows for multi-chain token launchpad operations:

1. **token-deploy** — HTTP trigger for deploying ERC20 tokens via TokenFactory
2. **fair-launch-finalize** — Cron trigger (5min) for finalizing ended FairLaunch campaigns
3. **airdrop-create** — HTTP trigger for creating tiered HumanDrop airdrops

All workflows support 3 chains:
- World Chain Sepolia
- Arbitrum Sepolia
- Base Sepolia

## File Structure

```
workflow/
├── abi.ts                                    # Shared ABI fragments (TokenFactory, FairLaunch, HumanDrop)
│
├── token-deploy.ts                           # Token deployment workflow
├── token-deploy.config.staging.json          # Config with TokenFactory addresses per chain
├── token-deploy.workflow.yaml                # CRE deployment manifest
│
├── fair-launch-finalize.ts                   # Launch finalization cron workflow
├── fair-launch-finalize.config.staging.json  # Config with FairLaunch addresses + schedule
├── fair-launch-finalize.workflow.yaml        # CRE deployment manifest
│
├── airdrop-create.ts                         # Airdrop creation workflow
├── airdrop-create.config.staging.json        # Config with HumanDrop addresses per chain
├── airdrop-create.workflow.yaml              # CRE deployment manifest
│
├── README.md                                 # Usage guide + testing instructions
├── IMPLEMENTATION_SUMMARY.md                 # This file
│
└── main.ts                                   # Existing airdrop-claim workflow (unchanged)
```

## Key Implementation Details

### 1. token-deploy.ts

**Trigger:** HTTP with EVM address authorization
**Gas Limit:** 1,000,000 (token deployment is gas-intensive)

**Flow:**
1. Parse input: `{creator, name, symbol, initialSupply, decimals, enableMinting, targetChain}`
2. Route to correct chain + TokenFactory address
3. Call `TokenFactory.deployToken()` via `EVMClient.writeReport()`
4. Return tx hash (frontend parses logs for token address)

**Error Handling:**
- `INVALID_CHAIN:` — unsupported targetChain
- `TOKEN_DEPLOY_FAILED:` — tx status != SUCCESS

### 2. fair-launch-finalize.ts

**Trigger:** Cron (`*/5 * * * *` = every 5 minutes)
**Gas Limit:** 500,000 per finalize call

**Flow:**
1. Process each chain sequentially (World, Arb, Base)
2. Per chain:
   - Read `launchCount()` to get total launches
   - Iterate 0 to N-1:
     - Read `getLaunch(id)` to get Launch struct
     - If `endTime < now && !finalized`, call `finalize(id)`
3. Log finalization count per chain
4. Return total finalized count

**Error Handling:**
- Per-chain errors logged but don't stop other chains
- Per-launch finalize failures logged, continue to next launch
- Resilient to individual tx failures

### 3. airdrop-create.ts

**Trigger:** HTTP with EVM address authorization
**Gas Limit:** 500,000

**Flow:**
1. Parse input: `{creator, token, amountOrb, amountDevice, maxClaims, expiry, targetChain}`
2. Route to correct chain + HumanDrop address
3. Call `HumanDrop.createAirdrop()` via `EVMClient.writeReport()`
4. Return tx hash (frontend parses logs for airdropId)

**Error Handling:**
- `INVALID_CHAIN:` — unsupported targetChain
- `AIRDROP_CREATE_FAILED:` — tx status != SUCCESS

## Chain Routing Pattern (Used in All Workflows)

```typescript
let chainSelector: string;
let contractAddress: string;

switch (request.targetChain) {
  case "world-chain":
    chainSelector = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-worldchain-1"];
    contractAddress = runtime.config.contractWorldChain;
    break;
  case "arbitrum-sepolia":
    chainSelector = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-arbitrum-1"];
    contractAddress = runtime.config.contractArbSepolia;
    break;
  case "base-sepolia":
    chainSelector = EVMClient.SUPPORTED_CHAIN_SELECTORS["ethereum-testnet-sepolia-base-1"];
    contractAddress = runtime.config.contractBaseSepolia;
    break;
  default:
    throw new Error(`INVALID_CHAIN: ${request.targetChain}`);
}

const client = new EVMClient(chainSelector);
```

## CRE Patterns Followed

### 1. Synchronous `.result()` (Never `await`)
```typescript
// CORRECT
const report = runtime.report(prepareReportRequest(calldata)).result();
const writeResult = client.writeReport(runtime, { receiver, report }).result();

// WRONG — DO NOT USE
const report = await runtime.report(...);  // ❌
```

### 2. EVMClient Read Pattern
```typescript
const calldata = encodeFunctionData({ abi, functionName, args });

const result = client.callContract(runtime, {
  call: encodeCallMsg({
    from: ZERO_ADDR,
    to: contractAddress,
    data: calldata,
  }),
  blockNumber: LATEST_BLOCK_NUMBER,
}).result(); // Synchronous!

const hex = bytesToHex(result.data) as Hex;
const decoded = decodeFunctionResult({ abi, functionName, data: hex });
```

### 3. EVMClient Write Pattern
```typescript
const calldata = encodeFunctionData({ abi, functionName, args });
const report = runtime.report(prepareReportRequest(calldata)).result();

const writeResult = client.writeReport(runtime, {
  receiver: contractAddress,
  report: report,
  gasConfig: { gasLimit: "500000" },
}).result();

if (writeResult.txStatus !== "TX_STATUS_SUCCESS") {
  throw new Error(`WRITE_FAILED: ${writeResult.txStatus}`);
}
```

### 4. HTTP Trigger with Auth
```typescript
const http = new HTTPCapability();

handler(
  http.trigger({
    authorizedKeys: [{
      type: "KEY_TYPE_ECDSA_EVM",
      publicKey: config.authorizedEVMAddress,
    }],
  }),
  onHttpTrigger
)
```

### 5. Cron Trigger
```typescript
const cron = new CronCapability();

handler(
  cron.trigger({ schedule: config.schedule }), // "*/5 * * * *"
  onCronTrigger
)
```

## Configuration Required

Before deployment, update config files with deployed contract addresses:

**token-deploy.config.staging.json**
```json
{
  "tokenFactoryWorldChain": "0x...",      // ← Deploy TokenFactory on World Chain
  "tokenFactoryArbSepolia": "0x...",      // ← Deploy TokenFactory on Arb Sepolia
  "tokenFactoryBaseSepolia": "0x...",     // ← Deploy TokenFactory on Base Sepolia
  "authorizedEVMAddress": "0x..."         // ← Backend signer address
}
```

**fair-launch-finalize.config.staging.json**
```json
{
  "fairLaunchWorldChain": "0x...",        // ← Deploy FairLaunch on World Chain
  "fairLaunchArbSepolia": "0x...",        // ← Deploy FairLaunch on Arb Sepolia
  "fairLaunchBaseSepolia": "0x...",       // ← Deploy FairLaunch on Base Sepolia
  "schedule": "*/5 * * * *"               // ← Cron schedule (default: every 5 min)
}
```

**airdrop-create.config.staging.json**
```json
{
  "humanDropWorldChain": "0x...",         // ← Deploy HumanDrop on World Chain
  "humanDropArbSepolia": "0xCeb84...",    // ← Already deployed on Arb Sepolia
  "humanDropBaseSepolia": "0x...",        // ← Deploy HumanDrop on Base Sepolia
  "authorizedEVMAddress": "0x..."         // ← Backend signer address
}
```

## Simulation

Test workflows locally before deploying:

```bash
cd workflow
bun install

# Token Deploy
cre workflow simulate token-deploy --target staging --workflow-file token-deploy.workflow.yaml

# Fair Launch Finalize
cre workflow simulate fair-launch-finalize --target staging --workflow-file fair-launch-finalize.workflow.yaml

# Airdrop Create
cre workflow simulate airdrop-create --target staging --workflow-file airdrop-create.workflow.yaml
```

## Deployment

```bash
# Deploy to CRE staging
cre workflow deploy token-deploy --target staging --workflow-file token-deploy.workflow.yaml
cre workflow deploy fair-launch-finalize --target staging --workflow-file fair-launch-finalize.workflow.yaml
cre workflow deploy airdrop-create --target staging --workflow-file airdrop-create.workflow.yaml

# Monitor logs
cre workflow logs token-deploy --target staging
cre workflow logs fair-launch-finalize --target staging
cre workflow logs airdrop-create --target staging
```

## Integration with Backend

### HTTP Workflows (token-deploy, airdrop-create)

**Request from Next.js API:**
```typescript
const response = await fetch(CRE_WORKFLOW_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    creator: "0x...",
    name: "My Token",
    symbol: "MTK",
    initialSupply: "1000000000000000000000000",
    decimals: 18,
    enableMinting: true,
    targetChain: "world-chain"
  })
});

const result = await response.json();
// { success: true, chain: "world-chain", txHash: "0x...", ... }
```

**Error Handling:**
Backend can parse error prefixes:
- `INVALID_CHAIN:` → 400 Bad Request
- `TOKEN_DEPLOY_FAILED:` → 500 Internal Server Error
- `AIRDROP_CREATE_FAILED:` → 500 Internal Server Error

### Cron Workflow (fair-launch-finalize)

Runs automatically every 5 minutes — no backend integration needed.
Monitor via CRE logs to track finalization activity.

## Security

1. **Operator-Gated Contracts:** All contract write methods restricted to CRE operator address
2. **HTTP Auth:** token-deploy + airdrop-create require authorized EVM signature
3. **Gas Limits:** Explicit gas limits prevent runaway execution costs
4. **Multi-Chain Isolation:** Chain routing prevents accidental cross-chain writes
5. **Error Propagation:** Descriptive errors prevent silent failures

## Gas Optimization

| Workflow | Operation | Gas Limit | Notes |
|----------|-----------|-----------|-------|
| token-deploy | deployToken | 1,000,000 | Token contract deployment |
| fair-launch-finalize | finalize | 500,000 | Per-launch finalization |
| airdrop-create | createAirdrop | 500,000 | Airdrop creation |

All workflows use **BFT consensus (Runtime)** for write operations — transactions signed by DON quorum.

## Testing Checklist

Before production deployment:

- [ ] Deploy all contracts (TokenFactory, FairLaunch, HumanDrop) on all chains
- [ ] Update all config files with deployed addresses
- [ ] Set authorized EVM address for HTTP workflows
- [ ] Run local simulation for each workflow
- [ ] Deploy to CRE staging
- [ ] Test HTTP workflows with real payloads
- [ ] Verify cron workflow runs (check logs after 5 min)
- [ ] Confirm on-chain state changes (deployed tokens, finalized launches, created airdrops)
- [ ] Test multi-chain routing (World, Arb, Base)
- [ ] Verify gas usage matches expectations
- [ ] Test error scenarios (invalid chain, failed txs)

## Maintenance

**Adding New Chain:**
1. Add chain selector from `EVMClient.SUPPORTED_CHAIN_SELECTORS`
2. Update config schema to include new chain address
3. Add case to chain routing switch statement
4. Deploy contracts on new chain
5. Update config files

**Adjusting Cron Schedule:**
Edit `fair-launch-finalize.config.staging.json`:
```json
{
  "schedule": "0 * * * *"  // Every hour instead of every 5 min
}
```

**Updating Gas Limits:**
Adjust `gasConfig.gasLimit` in write operations if on-chain gas costs change.

## Known Limitations

1. **Stateless Execution:** No persistent state between trigger fires
2. **fair-launch-finalize:** Iterates all launches — may hit gas/timeout limits if N > 100
3. **Error Recovery:** Failed finalize attempts logged but not retried (waits for next cron)
4. **Concurrent Writes:** Multiple workflows can't coordinate — ensure no conflicting operations

## Next Steps

1. **Deploy Contracts:** Use Foundry/Hardhat to deploy TokenFactory, FairLaunch, HumanDrop on all chains
2. **Update Configs:** Fill in deployed addresses in all `.config.staging.json` files
3. **Simulate:** Run `cre workflow simulate` for each workflow
4. **Deploy to CRE:** Run `cre workflow deploy` for each workflow
5. **Integrate Backend:** Update Next.js API routes to call CRE HTTP workflows
6. **Monitor:** Set up log monitoring for cron workflow execution

## Support

- **CRE Docs:** https://docs.chain.link/chainlink-runtime-environment
- **SDK Reference:** @chainlink/cre-sdk v1.0.9
- **viem Docs:** https://viem.sh (for ABI encoding/decoding)
