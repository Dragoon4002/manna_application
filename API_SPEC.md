# API Specification — Backend Routes

All API routes needed to wire frontend → contracts + CRE workflows.

---

## Authentication Routes

### `POST /api/auth/wallet`

**Purpose:** Create JWT session from World App wallet authentication

**Request Body:**
```json
{
  "proof": "...",
  "merkle_root": "...",
  "nullifier_hash": "...",
  "verification_level": "orb"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wallet": "0x...",
  "verificationLevel": "orb"
}
```

**Implementation:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const { proof, nullifier_hash, verification_level } = await req.json();

  // TODO: Verify proof via World ID Cloud API or CRE

  const token = jwt.sign(
    { nullifier: nullifier_hash, level: verification_level },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return NextResponse.json({ success: true, token });
}
```

---

## Airdrop Routes

### `GET /api/airdrop/eligibility`

**Purpose:** Check if user is eligible for an airdrop

**Query Params:**
- `airdropId` (number)
- `nullifierHash` (string)

**Response:**
```json
{
  "eligible": true,
  "reason": "Active airdrop, not yet claimed"
}
```

**Implementation:**
```typescript
import { publicClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const airdropId = searchParams.get('airdropId');
  const nullifierHash = searchParams.get('nullifierHash');

  const eligible = await publicClient.readContract({
    address: HUMANDROP_ADDRESS,
    abi: HumanDropABI,
    functionName: 'isEligible',
    args: [BigInt(airdropId!), BigInt(nullifierHash!)],
  });

  return NextResponse.json({ eligible });
}
```

---

## Launch Routes

### `GET /api/launch/list`

**Purpose:** Get all active (non-finalized) fair launches

**Response:**
```json
{
  "launches": [
    {
      "id": 0,
      "token": "0x...",
      "creator": "0x...",
      "totalTokens": "1000000000000000000000",
      "tokensSold": "500000000000000000000",
      "raised": "5000000000000000000",
      "hardCap": "10000000000000000000",
      "softCap": "3000000000000000000",
      "startTime": 1730000000,
      "endTime": 1730086400,
      "startPrice": "1000000000000000",
      "endPrice": "2000000000000000",
      "finalized": false
    }
  ]
}
```

**Implementation:**
```typescript
import { publicClient, FAIRLAUNCH_ADDRESS } from '@/lib/contracts';
import FairLaunchABI from '@/abi/FairLaunch.json';

export async function GET() {
  const activeLaunchIds = await publicClient.readContract({
    address: FAIRLAUNCH_ADDRESS,
    abi: FairLaunchABI,
    functionName: 'getActiveLaunches',
  }) as bigint[];

  const launches = [];
  for (const id of activeLaunchIds) {
    const launch = await publicClient.readContract({
      address: FAIRLAUNCH_ADDRESS,
      abi: FairLaunchABI,
      functionName: 'getLaunch',
      args: [id],
    });
    launches.push({ id: Number(id), ...launch });
  }

  return NextResponse.json({ launches });
}
```

---

## Token Routes

### `POST /api/token/mint`

**Purpose:** Mint additional token supply (triggers CRE workflow)

**Request Body:**
```json
{
  "tokenAddress": "0x...",
  "to": "0x...",
  "amount": "1000000000000000000000",
  "targetChain": "arbitrum-sepolia"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "chain": "arbitrum-sepolia"
}
```

**Implementation:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Forward to CRE workflow
  const res = await fetch(process.env.CRE_TOKEN_MINT_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  return NextResponse.json(result);
}
```

---

## Portfolio Routes

### `GET /api/portfolio`

**Purpose:** Get multi-chain token balances (triggers CRE workflow)

**Query Params:**
- `wallet` (address)

**Response:**
```json
{
  "success": true,
  "wallet": "0x...",
  "balances": [
    {
      "token": "0x...",
      "symbol": "HDT",
      "balance": "1000000000000000000000",
      "chain": "world-chain",
      "decimals": 18
    },
    {
      "token": "0x...",
      "symbol": "USDC",
      "balance": "500000000",
      "chain": "arbitrum-sepolia",
      "decimals": 6
    }
  ]
}
```

**Implementation:**
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  // Define tokens to check across chains
  const tokens = [
    { address: process.env.NEXT_PUBLIC_HDT_WORLD!, symbol: 'HDT', decimals: 18, chain: 'world-chain' },
    { address: process.env.NEXT_PUBLIC_HDT_ARB!, symbol: 'HDT', decimals: 18, chain: 'arbitrum-sepolia' },
    { address: process.env.NEXT_PUBLIC_HDT_BASE!, symbol: 'HDT', decimals: 18, chain: 'base-sepolia' },
  ];

  const res = await fetch(process.env.CRE_PORTFOLIO_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, tokens }),
  });

  const result = await res.json();
  return NextResponse.json(result);
}
```

---

## Stats Routes

### `GET /api/stats`

**Purpose:** Get protocol-wide statistics from MannaIndex

**Response:**
```json
{
  "totalAirdrops": 42,
  "totalLaunches": 15,
  "totalUsers": 1234,
  "totalVolume": "50000000000000000000000",
  "lastUpdate": 1730123456
}
```

**Implementation:**
```typescript
import { publicClient, MANNAINDEX_ADDRESS } from '@/lib/contracts';
import MannaIndexABI from '@/abi/MannaIndex.json';

export async function GET() {
  const stats = await publicClient.readContract({
    address: MANNAINDEX_ADDRESS,
    abi: MannaIndexABI,
    functionName: 'getStats',
  });

  return NextResponse.json(stats);
}
```

---

## Staking Routes

### `POST /api/staking/stake`

**Purpose:** Stake tokens into StakingVault

**Request Body:**
```json
{
  "amount": "1000000000000000000000",
  "lockPeriod": 30
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "positionId": 0
}
```

**Implementation:**
```typescript
import { getWalletClient, STAKINGVAULT_ADDRESS } from '@/lib/contracts';
import StakingVaultABI from '@/abi/StakingVault.json';

export async function POST(req: NextRequest) {
  const { amount, lockPeriod } = await req.json();
  const walletClient = getWalletClient();

  const hash = await walletClient.writeContract({
    address: STAKINGVAULT_ADDRESS,
    abi: StakingVaultABI,
    functionName: 'stake',
    args: [BigInt(amount), BigInt(lockPeriod)],
  });

  return NextResponse.json({ success: true, txHash: hash });
}
```

### `POST /api/staking/unstake`

**Purpose:** Unstake tokens from StakingVault

**Request Body:**
```json
{
  "positionId": 0
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x..."
}
```

**Implementation:**
```typescript
export async function POST(req: NextRequest) {
  const { positionId } = await req.json();
  const walletClient = getWalletClient();

  const hash = await walletClient.writeContract({
    address: STAKINGVAULT_ADDRESS,
    abi: StakingVaultABI,
    functionName: 'unstake',
    args: [BigInt(positionId)],
  });

  return NextResponse.json({ success: true, txHash: hash });
}
```

### `GET /api/staking/positions`

**Purpose:** Get staking positions for a wallet

**Query Params:**
- `wallet` (address)

**Response:**
```json
{
  "positions": [
    {
      "id": 0,
      "amount": "1000000000000000000000",
      "lockPeriod": 30,
      "startTime": 1730000000,
      "claimed": false
    }
  ]
}
```

**Implementation:**
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  const positions = await publicClient.readContract({
    address: STAKINGVAULT_ADDRESS,
    abi: StakingVaultABI,
    functionName: 'getPositions',
    args: [wallet as `0x${string}`],
  });

  return NextResponse.json({ positions });
}
```

---

## Payout Routes

### `POST /api/payouts/create`

**Purpose:** Create batch payout via BatchPayout contract

**Request Body:**
```json
{
  "token": "0x...",
  "recipients": ["0x...", "0x..."],
  "amounts": ["1000000000000000000", "2000000000000000000"]
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "payoutId": 5
}
```

**Implementation:**
```typescript
import { getWalletClient, BATCHPAYOUT_ADDRESS } from '@/lib/contracts';
import BatchPayoutABI from '@/abi/BatchPayout.json';

export async function POST(req: NextRequest) {
  const { token, recipients, amounts } = await req.json();
  const walletClient = getWalletClient();

  const hash = await walletClient.writeContract({
    address: BATCHPAYOUT_ADDRESS,
    abi: BatchPayoutABI,
    functionName: 'distribute',
    args: [token, recipients, amounts],
  });

  return NextResponse.json({ success: true, txHash: hash });
}
```

### `GET /api/payouts/history`

**Purpose:** Get payout history for a wallet

**Query Params:**
- `wallet` (address)

**Response:**
```json
{
  "payouts": [
    {
      "id": 5,
      "token": "0x...",
      "totalAmount": "3000000000000000000",
      "recipientCount": 2,
      "timestamp": 1730123456
    }
  ]
}
```

**Implementation:**
```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  const payoutIds = await publicClient.readContract({
    address: BATCHPAYOUT_ADDRESS,
    abi: BatchPayoutABI,
    functionName: 'getPayouts',
    args: [wallet as `0x${string}`],
  });

  const payouts = [];
  for (const id of payoutIds as bigint[]) {
    const payout = await publicClient.readContract({
      address: BATCHPAYOUT_ADDRESS,
      abi: BatchPayoutABI,
      functionName: 'getPayout',
      args: [id],
    });
    payouts.push({ id: Number(id), ...payout });
  }

  return NextResponse.json({ payouts });
}
```

---

## Summary

### API Routes to Create (10 total)

| Route | Method | Purpose | CRE? |
|-------|--------|---------|------|
| `/api/auth/wallet` | POST | Create JWT session | No |
| `/api/airdrop/eligibility` | GET | Check eligibility | No |
| `/api/launch/list` | GET | Get active launches | No |
| `/api/token/mint` | POST | Mint tokens | Yes |
| `/api/portfolio` | GET | Multi-chain balances | Yes |
| `/api/stats` | GET | Protocol stats | No |
| `/api/staking/stake` | POST | Stake tokens | No |
| `/api/staking/unstake` | POST | Unstake tokens | No |
| `/api/staking/positions` | GET | Get positions | No |
| `/api/payouts/create` | POST | Batch payout | No |
| `/api/payouts/history` | GET | Payout history | No |

### Environment Variables Needed

```bash
# JWT
JWT_SECRET=random_secret_here

# CRE Workflow URLs
CRE_TOKEN_MINT_URL=https://...
CRE_PORTFOLIO_URL=https://...

# Contract Addresses (already in .env)
NEXT_PUBLIC_HUMANDROP_ADDRESS=0x...
NEXT_PUBLIC_FAIRLAUNCH_ADDRESS=0x...
NEXT_PUBLIC_STAKINGVAULT_ADDRESS=0x...
NEXT_PUBLIC_BATCHPAYOUT_ADDRESS=0x...
NEXT_PUBLIC_MANNAINDEX_ADDRESS=0x...
```

### File Structure

```
manna_app/src/app/api/
├── auth/
│   └── wallet/
│       └── route.ts
├── airdrop/
│   └── eligibility/
│       └── route.ts
├── launch/
│   └── list/
│       └── route.ts
├── token/
│   └── mint/
│       └── route.ts
├── portfolio/
│   └── route.ts
├── stats/
│   └── route.ts
├── staking/
│   ├── stake/
│   │   └── route.ts
│   ├── unstake/
│   │   └── route.ts
│   └── positions/
│       └── route.ts
└── payouts/
    ├── create/
    │   └── route.ts
    └── history/
        └── route.ts
```

---

## Next: Frontend Integration

After creating these API routes, wire frontend pages:
- `/airdrops` → call `/api/airdrop/eligibility` before showing claim button
- `/fair-launch` → call `/api/launch/list` to populate launch cards
- `/staking` → call `/api/staking/positions` to show user positions
- `/dashboards` → call `/api/stats` to display protocol metrics
- `/portfolio` → call `/api/portfolio` to show multi-chain balances
