# ProofSentinel: CRE Workflow Simulation Guide

Complete reference for how ProofSentinel simulates a Chainlink CRE workflow. Covers every component, data flow, decision point, and interaction so you can replicate this pattern for any domain.

---

## 1. High-Level Architecture

```
 +-----------------+    cron    +------------------+   GET /monitoring/:id   +------------------+
 | CRE Workflow    |----------->| Backend API      |<----------------------->| On-Chain (RPC)   |
 | (DON / local    |            | (Express :3001)  |   ethers.js calls       | balanceOf()      |
 |  simulator)     |   POST     |                  |                         | totalSupply()    |
 |                 |----------->| POST /alerts     |                         | getBalance()     |
 |                 |   /alerts  |                  |                         +------------------+
 |  EVMClient      |            | POST /safeguard  |------+
 |  callContract() |            +------------------+      |
 +--------+--------+                   |                  v
          |                            |          +------------------+
          |                            |          | ReserveMonitor   |
          +--- pauseWithdrawals() -----|--------->| .sol (Sepolia)   |
               (on critical only)      |          | pauseWithdrawals |
                                       |          | emitReserveAlert |
                                       v          +------------------+
                              +------------------+
                              | PostgreSQL (Neon) |
                              | via Prisma ORM    |
                              | Protocol, Alert,  |
                              | MonitoringSnapshot|
                              +------------------+
                                       ^
                                       |
                              +------------------+
                              | Dashboard         |
                              | (Next.js :3000)   |
                              | polls GET /alerts |
                              | GET /monitoring   |
                              +------------------+
```

---

## 2. The CRE Workflow (What Runs on the DON)

**File:** `cre-workflows/monitoring-workflow/main.ts`

The CRE workflow is the orchestrator. It runs on the Chainlink Decentralized Oracle Network (DON) on a cron schedule. Locally, you simulate it with `cre workflow simulate`.

### 2.1 Trigger: CronCapability

```ts
export const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)];
};
```

- **Staging:** `*/30 * * * * *` (every 30 seconds)
- **Production:** `0 */5 * * * *` (every 5 minutes)
- The cron expression is 6-field (sec min hour day month dow)

### 2.2 Config Shape

```ts
type Config = {
  schedule: string;          // cron expression
  apiBaseUrl: string;        // backend URL (e.g. http://localhost:3001)
  protocolId: string;        // which protocol to monitor
  evm?: {
    chainSelectorName: string;         // e.g. "ethereum-testnet-sepolia"
    reserveMonitorAddress: string;     // deployed ReserveMonitor contract
  };
};
```

Config is loaded from `config.staging.json` or `config.production.json`.

### 2.3 The `onCronTrigger` Handler (Step-by-Step)

This is the core logic. Every cron tick executes this function:

**Step 1 - Fetch monitoring snapshot via HTTP:**
```
GET {apiBaseUrl}/monitoring/{protocolId}
```
Uses `cre.capabilities.ConfidentialHTTPClient` (HTTP calls from the DON are made through a confidential channel so API keys stay encrypted).

Response shape:
```json
{
  "protocolId": "demo",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "reserves": "1000000000000000000",
  "liabilities": "800000000000000000",
  "reserveRatio": 1.25,
  "status": "healthy"
}
```

**Step 2 - Branch on status:**

| Status | Action |
|--------|--------|
| `healthy` | Do nothing. Return result. |
| `warning` | POST alert to backend with severity `"warning"`. |
| `critical` | POST alert with severity `"critical"` + trigger on-chain safeguard. |

**Step 3 - Post alert (warning or critical):**
```
POST {apiBaseUrl}/alerts
Body: { protocolId, severity, message, ratio }
```

**Step 4 - On-chain safeguard (critical only, if `evm` config present):**

1. Resolve the network via `getNetwork({ chainFamily: "evm", chainSelectorName })`.
2. Create `EVMClient` with the chain selector.
3. **Safety check:** Read `withdrawalsPaused()` view function first. If already paused, skip.
4. **Write:** Call `pauseWithdrawals()` via `evmClient.callContract()`.
5. Uses `viem` for ABI encoding: `encodeFunctionData`, `decodeFunctionResult`.

**Step 5 - Return result:**
```ts
{ status, reserveRatio, alertSent, safeguardTriggered }
```

### 2.4 CRE SDK Capabilities Used

| Capability | Purpose | Import |
|------------|---------|--------|
| `CronCapability` | Schedule-based trigger | `cre.capabilities.CronCapability` |
| `ConfidentialHTTPClient` | HTTP calls from DON (GET/POST) | `cre.capabilities.ConfidentialHTTPClient` |
| `EVMClient` | On-chain read/write | `cre.capabilities.EVMClient` |
| `getNetwork` | Resolve chain selector from name | `@chainlink/cre-sdk` |
| `encodeCallMsg` | Encode EVM call message | `@chainlink/cre-sdk` |
| `LAST_FINALIZED_BLOCK_NUMBER` | Use finalized block for reads | `@chainlink/cre-sdk` |

### 2.5 Decision Flowchart

```
Cron fires
    |
    v
GET /monitoring/{protocolId}
    |
    +-- HTTP fails? --> return { status: "error" }
    |
    v
Parse snapshot.status
    |
    +-- "healthy" --> return { alertSent: false, safeguardTriggered: false }
    |
    +-- "warning" --> POST /alerts (severity: warning)
    |                 return { alertSent: true, safeguardTriggered: false }
    |
    +-- "critical" --> POST /alerts (severity: critical)
                       |
                       +-- no evm config? --> return { alertSent: true, safeguardTriggered: false }
                       |
                       +-- evm config present:
                           |
                           +-- read withdrawalsPaused()
                           |     |
                           |     +-- already paused? --> skip write, safeguardTriggered: true
                           |     |
                           |     +-- not paused? --> call pauseWithdrawals()
                           |                         safeguardTriggered: true
                           |
                           v
                       return { alertSent: true, safeguardTriggered: true }
```

---

## 3. Backend API (What the Workflow Calls)

**File:** `backend/api-server/app.ts` (Express on port 3001)

The backend is the data layer and computation engine. The CRE workflow never directly touches the chain for reserves/liabilities -- it delegates to the backend.

### 3.1 Endpoints

| Method | Path | Called By | Purpose |
|--------|------|-----------|---------|
| POST | `/protocol` | Dashboard/setup | Register protocol config |
| GET | `/protocols` | Dashboard | List all protocols |
| GET | `/monitoring/:protocolId` | **CRE workflow** | Fetch reserves, compute ratio, return snapshot |
| GET | `/monitoring/:protocolId/history` | Dashboard | Historical snapshots |
| GET | `/alerts` | Dashboard | All alerts (optional `?protocolId=`) |
| GET | `/alerts/:protocolId` | Dashboard | Alerts for specific protocol |
| POST | `/alerts` | **CRE workflow** | Record an alert |
| POST | `/safeguard` | Dashboard/manual | Execute on-chain safeguard via backend |
| PUT | `/protocol/:id/merkle-tree` | Setup | Update Merkle liability data |
| POST | `/protocol/:id/merkle-verify` | Users | Verify Merkle proof |

### 3.2 `GET /monitoring/:protocolId` (The Critical Endpoint)

This is what the CRE workflow calls every cron tick. Here's exactly what happens:

1. **Lookup protocol** from DB by `protocolId`. 404 if not found.
2. **Call `monitorProtocol(config)`** (monitoring-service).
3. **Build snapshot** `{ protocolId, timestamp, reserves, liabilities, reserveRatio, status }`.
4. **Persist** snapshot to `MonitoringSnapshot` table.
5. **Return** snapshot as JSON.

### 3.3 `POST /alerts` (Alert Recording)

Body: `{ protocolId, severity, message, ratio? }`

- Generates `alertId` as `alert-{counter}-{timestamp}`.
- Creates `Alert` row in DB with type `"reserve_ratio"`.
- Returns the created alert.

---

## 4. Monitoring Service (Reserve/Liability Computation)

**File:** `backend/monitoring-service/index.ts`

This is where the actual on-chain data fetching and risk evaluation happens.

### 4.1 `monitorProtocol(config)` Flow

```
1. Determine RPC URL (config.rpcUrl or fallback "https://eth.llamarpc.com")
2. Fetch reserves
3. Fetch liabilities
4. Compute ratio = reserves / liabilities
5. Evaluate risk status
6. Return { reserves, liabilities, ratio, status, shouldTriggerSafeguard }
```

### 4.2 Reserve Fetching

**Function:** `fetchReserves(rpcUrl, wallets, tokenAddress?)`

For each wallet in `reserveWallets[]`:
- **If `tokenAddress` is set** (ERC20): call `ERC20.balanceOf(wallet)` via ethers.js
- **If no token** (native ETH/BNB): call `provider.getBalance(wallet)`
- Sum all balances into a single `bigint`

### 4.3 Liability Fetching

**Function:** `fetchLiabilities(config, rpcUrl)`

Three modes based on `config.liabilitySource`:

| Source | How It Works |
|--------|-------------|
| `"token"` | Calls `ERC20.totalSupply()` on `config.tokenAddress`. Liabilities = total token supply. |
| `"merkle"` | Reads stored `merkleTreeData` leaves. Rebuilds tree, verifies root matches stored `merkleRoot` (tamper check). Sums all leaf balances. |
| `"api"` | Fetches `config.liabilityApiUrl`, extracts value at `config.liabilityApiPath` (dot-separated JSON path, e.g. `"data.totalLiabilities"`). |

### 4.4 Merkle Liability Details

**File:** `backend/merkle-service/index.ts`

Leaf structure: `{ userId: string, balance: string }`

- **Hash leaf:** `keccak256(abi.encodePacked(userId, balance))` using `ethers.solidityPackedKeccak256`
- **Hash pair:** Sort the two hashes lexicographically (smaller first), then `keccak256(abi.encodePacked(left, right))`
- **Odd nodes:** Promoted to next layer without pairing
- **Total liabilities:** Sum of all `BigInt(leaf.balance)` values
- **Tamper check:** On each monitoring run, rebuild tree from stored leaves and verify root matches stored `merkleRoot`

### 4.5 API Liability Details

**File:** `backend/api-liability-service/index.ts`

- Fetches the URL with `Accept: application/json`
- Extracts value using dot-path navigation (e.g. `"data.total"` walks `response.data.total`)
- If the value is a float, multiplies by 1e18 (assumes human-readable units)
- If integer string, converts directly to BigInt

---

## 5. Risk Engine (Pure Functions)

**File:** `backend/risk-engine/index.ts`

Three functions with no side effects:

### 5.1 `computeReserveRatio(reserves: bigint, liabilities: bigint): number`
- Returns `0` if liabilities is `0n`
- Otherwise: `Number(reserves) / Number(liabilities)`

### 5.2 `evaluateRisk(ratio: number, thresholds: Thresholds): RiskStatus`

```
if ratio < criticalRatio  --> "critical"
if ratio < warningRatio   --> "warning"
else                       --> "healthy"
```

Default thresholds: `{ minReserveRatio: 1.0, warningRatio: 1.1, criticalRatio: 0.95 }`

Meaning:
- Ratio >= 1.1 = healthy (reserves cover 110%+ of liabilities)
- 0.95 <= ratio < 1.1 = warning
- Ratio < 0.95 = critical (reserves cover less than 95% of liabilities)

### 5.3 `shouldTriggerSafeguard(ratio, criticalRatio): boolean`
- `ratio < criticalRatio`

---

## 6. Safeguard Service (On-Chain Actions)

**File:** `backend/safeguard-service/index.ts`

Called via `POST /safeguard` (backend-initiated) or by the CRE workflow's `EVMClient` directly.

### 6.1 Backend Path

`executeSafeguard(rpcUrl, contractAddress, action, ratio?)`:

1. Load `DEPLOYER_PRIVATE_KEY` from env
2. Create ethers `Wallet` + `Contract`
3. Switch on action:
   - `"pause_withdrawals"` -> `contract.pauseWithdrawals()`
   - `"pause_deposits"` -> `contract.pauseDeposits()`
   - `"emit_alert"` -> `contract.emitReserveAlert(ratio * 10000)` (basis points)
4. Wait for tx confirmation
5. Return tx hash

### 6.2 CRE Workflow Path

The CRE workflow calls `pauseWithdrawals()` directly via `EVMClient.callContract()`, bypassing the backend safeguard endpoint. This is the decentralized path -- the DON nodes execute the transaction.

---

## 7. Smart Contract

**File:** `contracts/src/ReserveMonitor.sol`
**Deployed:** Sepolia `0xb80D135fb054ce3b27Ef67Eca016DBACff0F89B3`

### 7.1 Role-Based Access

| Role | Who | Can Call |
|------|-----|----------|
| `admin` | Deployer (msg.sender in constructor) | Everything |
| `oracles[addr]` | CRE DON forwarder (granted post-deploy) | `pauseWithdrawals`, `unpauseWithdrawals`, `emitReserveAlert` |

### 7.2 Functions

| Function | Access | Effect |
|----------|--------|--------|
| `grantOracleRole(addr)` | admin only | Add oracle |
| `revokeOracleRole(addr)` | admin only | Remove oracle |
| `pauseWithdrawals()` | admin OR oracle | Sets `withdrawalsPaused = true`, emits `WithdrawalsPaused` |
| `unpauseWithdrawals()` | admin OR oracle | Sets `withdrawalsPaused = false` |
| `pauseDeposits()` | admin only | Sets `depositsPaused = true` |
| `unpauseDeposits()` | admin only | Sets `depositsPaused = false` |
| `emitReserveAlert(ratio)` | admin OR oracle | Emits `ReserveAlert(ratio)` event |

### 7.3 Post-Deploy Setup

After deploying, the admin must grant oracle role to the CRE DON forwarder address:
```solidity
reserveMonitor.grantOracleRole(donForwarderAddress);
```
This allows the CRE workflow's EVMClient transactions to pass the `onlyAuthorized` modifier.

---

## 8. Database Schema

**File:** `db/prisma/schema.prisma` (PostgreSQL via Neon)

### 8.1 Protocol

Stores the full configuration for a monitored protocol.

| Field | Type | Purpose |
|-------|------|---------|
| `protocolId` | String (unique) | Lookup key |
| `name` | String | Display name |
| `reserveWallets` | String[] | Wallet addresses holding reserves |
| `liabilitySource` | String | `"token"` / `"merkle"` / `"api"` |
| `tokenAddress` | String? | ERC20 for reserves + token liabilities |
| `tokenDecimals` | Int (default 18) | Token decimal places |
| `minReserveRatio` | Float (default 1.0) | Minimum acceptable ratio |
| `warningRatio` | Float (default 1.1) | Warning threshold |
| `criticalRatio` | Float (default 0.95) | Critical threshold |
| `reserveMonitorContractAddress` | String? | On-chain safeguard contract |
| `rpcUrl` | String? | Chain RPC endpoint |
| `merkleRoot` | String? | Stored Merkle root (for merkle source) |
| `merkleTreeData` | Json? | Array of `{userId, balance}` leaves |
| `liabilityApiUrl` | String? | External API URL (for api source) |
| `liabilityApiPath` | String? | JSON path to extract value |

### 8.2 Alert

| Field | Type | Purpose |
|-------|------|---------|
| `alertId` | String (unique) | `alert-{counter}-{timestamp}` |
| `protocolId` | String (FK) | Links to Protocol |
| `type` | String | Always `"reserve_ratio"` |
| `severity` | String | `"warning"` or `"critical"` |
| `message` | String | Human-readable description |
| `ratio` | Float? | Reserve ratio at time of alert |
| `timestamp` | DateTime | Auto-set on creation |

### 8.3 MonitoringSnapshot

| Field | Type | Purpose |
|-------|------|---------|
| `protocolId` | String (FK) | Links to Protocol |
| `reserves` | String | BigInt as string |
| `liabilities` | String | BigInt as string |
| `reserveRatio` | Float | Computed ratio |
| `status` | String | `"healthy"` / `"warning"` / `"critical"` |
| `timestamp` | DateTime | Auto-set |

---

## 9. CRE Configuration Files

### 9.1 `project.yaml` (Shared)

Defines RPC endpoints available to all workflows:
```yaml
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://ethereum-sepolia-rpc.publicnode.com
```

### 9.2 `workflow.yaml` (Per-Workflow)

Maps target names to entry points and config files:
```yaml
staging-settings:
  user-workflow:
    workflow-name: "proofsentinel-monitoring-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""
```

### 9.3 Config Files

**Staging** (`config.staging.json`):
```json
{
  "schedule": "*/30 * * * * *",
  "apiBaseUrl": "http://localhost:3001",
  "protocolId": "demo",
  "evm": {
    "chainSelectorName": "ethereum-testnet-sepolia",
    "reserveMonitorAddress": "0xb80D135fb054ce3b27Ef67Eca016DBACff0F89B3"
  }
}
```

**Production** (`config.production.json`):
```json
{
  "schedule": "0 */5 * * * *",
  "apiBaseUrl": "https://your-api.example.com",
  "protocolId": "your-protocol-id",
  "evm": {
    "chainSelectorName": "ethereum-testnet-sepolia",
    "reserveMonitorAddress": "0xb80D135fb054ce3b27Ef67Eca016DBACff0F89B3"
  }
}
```

### 9.4 Environment

`cre-workflows/.env`:
```
CRE_ETH_PRIVATE_KEY=<64-char-hex>
```

`backend/.env`:
```
PORT=3001
DATABASE_URL=postgresql://...
DEPLOYER_PRIVATE_KEY=<64-char-hex>
```

---

## 10. Complete Data Flow (End-to-End)

### Scenario: Reserve Ratio Drops Below Critical

```
T=0   Protocol registered via POST /protocol
      Config stored: { reserveWallets, tokenAddress, thresholds, rpcUrl }

T=30s CRE cron fires (staging: every 30s)

T=30s CRE workflow: GET http://localhost:3001/monitoring/demo
      |
      v
      Backend receives request:
        1. Lookup protocol "demo" in DB
        2. Call monitoring-service.monitorProtocol(config):
           a. fetchReserves(rpcUrl, wallets, tokenAddress)
              - For each wallet: ERC20.balanceOf(wallet) via RPC
              - Sum = 700 ETH (reserves dropped)
           b. fetchLiabilities(config, rpcUrl)
              - liabilitySource === "token"
              - ERC20.totalSupply() via RPC = 800 ETH
           c. computeReserveRatio(700, 800) = 0.875
           d. evaluateRisk(0.875, {warning: 1.1, critical: 0.95})
              - 0.875 < 0.95 --> "critical"
           e. shouldTriggerSafeguard(0.875, 0.95) = true
        3. Build snapshot: { ratio: 0.875, status: "critical" }
        4. Persist snapshot to MonitoringSnapshot table
        5. Return snapshot JSON

T=30s CRE workflow receives snapshot:
      - status === "critical"
      - POST http://localhost:3001/alerts
        Body: { protocolId: "demo", severity: "critical",
                message: "Reserve ratio below critical threshold (CRE workflow)",
                ratio: 0.875 }
      - Backend creates Alert row in DB

T=30s CRE workflow: on-chain safeguard
      - evm config present? Yes
      - getNetwork("ethereum-testnet-sepolia") --> chain selector
      - EVMClient(selector)
      - Read: withdrawalsPaused() --> false
      - Write: pauseWithdrawals()
      - DON nodes sign and submit tx to Sepolia
      - ReserveMonitor.withdrawalsPaused = true
      - Event: WithdrawalsPaused()

T=30s CRE returns: { status: "critical", ratio: 0.875,
                      alertSent: true, safeguardTriggered: true }

T=any Dashboard polls:
      - GET /monitoring/demo --> sees ratio 0.875, status critical
      - GET /alerts --> sees critical alert with message and ratio
```

---

## 11. How to Simulate Locally

### 11.1 Prerequisites

- Bun runtime
- PostgreSQL (or Neon DB URL)
- CRE CLI installed (`cre login`, `cre whoami`)

### 11.2 Step-by-Step

```bash
# 1. Start database
cd db && bun install
bunx prisma generate --schema=prisma/schema.prisma
bunx prisma db push --schema=prisma/schema.prisma

# 2. Start backend
cd backend && bun install && bun run dev:api
# --> http://localhost:3001

# 3. Register a protocol
curl -X POST http://localhost:3001/protocol \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "demo",
    "name": "Demo Protocol",
    "reserveWallets": ["0xYourWalletAddress"],
    "liabilitySource": "token",
    "tokenAddress": "0xYourTokenAddress",
    "minReserveRatio": 1.0,
    "warningRatio": 1.1,
    "criticalRatio": 0.95,
    "rpcUrl": "https://ethereum-sepolia-rpc.publicnode.com",
    "reserveMonitorContractAddress": "0xb80D135fb054ce3b27Ef67Eca016DBACff0F89B3"
  }'

# 4. Verify monitoring works
curl http://localhost:3001/monitoring/demo

# 5. Simulate CRE workflow
cd cre-workflows
echo "CRE_ETH_PRIVATE_KEY=your_key_here" > .env
cre workflow simulate ./monitoring-workflow --target=staging-settings
```

### 11.3 Simulate Without Real Chain (Mock Alerts)

```bash
# Post a warning alert manually
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{"protocolId":"demo","severity":"warning","message":"Reserve ratio dipping","ratio":1.05}'

# Post a critical alert manually
curl -X POST http://localhost:3001/alerts \
  -H "Content-Type: application/json" \
  -d '{"protocolId":"demo","severity":"critical","message":"Reserve ratio below 0.95","ratio":0.87}'

# Trigger safeguard manually (requires contract address + DEPLOYER_PRIVATE_KEY)
curl -X POST http://localhost:3001/safeguard \
  -H "Content-Type: application/json" \
  -d '{"protocolId":"demo","action":"pause_withdrawals"}'
```

---

## 12. Testing the Simulation

### 12.1 Unit Tests

**CRE workflow tests** (`cre-workflows/monitoring-workflow/main.test.ts`):

Uses `@chainlink/cre-sdk/test` mocks:
- `newTestRuntime()` creates a mock runtime with config injection
- `ConfidentialHttpMock.testInstance()` intercepts HTTP calls
- Tests all branches: healthy (no alert), warning (alert only), critical (alert + safeguard), API error

```bash
cd cre-workflows/monitoring-workflow && bun test
```

**Contract tests** (`contracts/test/ReserveMonitor.test.ts`):
```bash
cd contracts && bunx hardhat test
```

### 12.2 E2E Tests

Sequential test steps (require backend running):

| Step | File | Tests |
|------|------|-------|
| 1 | `01_risk_engine.ts` | Pure function tests (offline). computeReserveRatio, evaluateRisk, shouldTriggerSafeguard. |
| 2 | `02_register_protocol.ts` | POST /protocol, verify listing. |
| 3 | `03_monitoring_check.ts` | GET /monitoring/:id (404 for unknown, 200/500 for known). |
| 4 | `04_alerts.ts` | POST /alerts (warning + critical), GET /alerts, filtering, 400 validation. |
| 5 | `05_safeguard.ts` | POST /safeguard validation (400 for missing fields, 404 for unknown, 400 for no contract). |
| 6 | `06_full_flow.ts` | Register -> list -> warn alert -> critical alert -> verify alerts -> safeguard validation -> 404 check. |
| 7 | `07_merkle_liability.ts` | Register with merkle source, verify root computed, PUT new leaves, verify proof, reject invalid proof, API liability source registration. |

```bash
cd e2e-test && bun install
bun run src/index.ts 1  # through 7
```

---

## 13. Generalizing This Pattern for Any Workflow

To build a CRE-simulated workflow for a different domain, replicate these layers:

### 13.1 The Pattern

```
[ CRE Workflow ]  --trigger-->  [ Backend API ]  --fetch-->  [ External Data Source ]
       |                              |                              |
       |--- decides action            |--- computes/evaluates        |--- chain, API, etc.
       |                              |
       +--- POST alert/action         +--- persists state
       +--- on-chain write (if needed)
```

### 13.2 Steps to Replicate

1. **Define your trigger.** CRE supports `CronCapability` (time-based). Your config specifies the schedule.

2. **Build a backend API** that:
   - Stores entity config (equivalent to `Protocol` here)
   - Has a "check" endpoint that fetches real-world data, runs evaluation logic, returns a status snapshot
   - Has an "action" endpoint to record events (alerts, etc.)

3. **Write the CRE workflow** (`main.ts`):
   - Import from `@chainlink/cre-sdk`
   - Define a `Config` type matching your config JSON
   - In the handler: use `ConfidentialHTTPClient` to call your backend
   - Branch on the returned status
   - Use `EVMClient` if you need on-chain writes

4. **Define thresholds/rules** in your config JSON (not hardcoded). The workflow just reads the status from the backend; the backend applies the rules.

5. **Deploy a smart contract** if you need on-chain state changes. Grant oracle role to the CRE DON forwarder after deployment.

6. **Configure CRE files:**
   - `project.yaml` - RPCs
   - `workflow.yaml` - entry points, config paths, target names
   - `config.{env}.json` - schedule, API URL, entity IDs, contract addresses

7. **Test:**
   - Unit test with `newTestRuntime()` + `ConfidentialHttpMock`
   - E2E test each backend endpoint individually
   - `cre workflow simulate` for local integration test

### 13.3 Key Design Decisions in ProofSentinel

| Decision | Rationale |
|----------|-----------|
| CRE calls backend HTTP, not chain directly | Backend can aggregate multiple wallets, multiple chains, multiple liability sources. CRE stays thin. |
| Backend computes the status, CRE just reads it | Separation of concerns. Business logic lives in testable backend code, not in the constrained CRE runtime. |
| CRE does the on-chain write, not backend | The DON provides decentralized execution. If the backend wrote, it'd be a single point of failure. |
| Safety check before write (`withdrawalsPaused()`) | Idempotency. Prevents redundant gas costs on repeated cron ticks. |
| Three liability sources (token/merkle/api) | Flexibility. Same monitoring pipeline works for DeFi protocols (token supply), exchanges (merkle tree), or any data source (API). |
| Sorted pair hashing in Merkle tree | Makes proofs order-independent. Any permutation of siblings produces the same parent hash. |

---

## 14. File Reference

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| CRE workflow | `cre-workflows/monitoring-workflow/main.ts` | 241 | Cron handler, HTTP calls, EVM writes |
| CRE test | `cre-workflows/monitoring-workflow/main.test.ts` | 125 | Mock-based unit tests |
| CRE config (staging) | `cre-workflows/monitoring-workflow/config.staging.json` | 9 | 30s cron, localhost |
| CRE config (prod) | `cre-workflows/monitoring-workflow/config.production.json` | 9 | 5min cron, prod URL |
| CRE project | `cre-workflows/project.yaml` | 16 | Shared RPCs |
| CRE workflow meta | `cre-workflows/monitoring-workflow/workflow.yaml` | 25 | Target -> artifact mapping |
| API server | `backend/api-server/app.ts` | 380 | Express routes, DB ops |
| API entry | `backend/api-server/index.ts` | 7 | Server listener |
| Monitoring | `backend/monitoring-service/index.ts` | 178 | Reserve/liability fetch + risk eval |
| Risk engine | `backend/risk-engine/index.ts` | 27 | Pure ratio/threshold functions |
| Safeguard | `backend/safeguard-service/index.ts` | 50 | On-chain contract calls |
| Merkle | `backend/merkle-service/index.ts` | 119 | Tree build, proof gen/verify |
| API liability | `backend/api-liability-service/index.ts` | 66 | External API fetch |
| Types | `backend/types.ts` | 46 | Shared TS types |
| Contract | `contracts/src/ReserveMonitor.sol` | 91 | On-chain safeguard + roles |
| DB schema | `db/prisma/schema.prisma` | 70 | Protocol, Alert, Snapshot models |
