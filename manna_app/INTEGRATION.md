# Frontend Integration Guide

Practical patterns for wiring pages to contracts, CRE workflows, and World App MiniKit.

---

## Auth Flow

Auth is already wired. Here's how to use it in pages.

### Session Access (Client Components)

```tsx
'use client';
import { useSession } from 'next-auth/react';

export default function MyPage() {
  const { data: session, status } = useSession();
  // status: 'loading' | 'authenticated' | 'unauthenticated'
  // session.user.walletAddress — Safe contract address (NOT EOA)
  // session.user.username — World App username
  // session.user.profilePictureUrl
}
```

### AuthGate Component

Wrap any interactive section that requires auth. Shows inline "Connect Wallet" prompt when unauthenticated.

```tsx
import { AuthGate } from '@/components/AuthGate';

export default function StakingPage() {
  return (
    <div>
      <h1>Staking</h1>
      {/* Public content — visible to everyone */}
      <StatsSection />

      {/* Gated content — shows "Connect Wallet" if not authed */}
      <AuthGate>
        <StakeForm />
        <YourPositions />
      </AuthGate>
    </div>
  );
}
```

### Session in API Routes (Server-Side)

All POST routes already have auth guards. To add to new routes:

```ts
import { getAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // session.user.walletAddress available here
}
```

---

## The 4 Interaction Patterns

### 1. Read Contract State (no user action needed)

Use `viem publicClient.readContract` server-side in API routes, or call GET API routes from the frontend.

**Server-side (API route):**
```ts
import { publicClient, HUMANDROP_ADDRESS } from '@/lib/contracts';
import HumanDropABI from '@/abi/HumanDrop.json';

const result = await publicClient.readContract({
  address: HUMANDROP_ADDRESS,
  abi: HumanDropABI,
  functionName: 'isEligible',
  args: [BigInt(airdropId), BigInt(nullifierHash)],
});
```

**Client-side (call your API route):**
```tsx
const res = await fetch(`/api/airdrop/eligibility?airdropId=${id}&nullifierHash=${hash}`);
const data = await res.json();
```

### 2. Write to Contract via MiniKit.sendTransaction

User signs in World App. The flow is:
1. Frontend calls your API route to **build** the transaction params
2. API returns `{ transaction: {...} }` or `{ transactions: [...] }`
3. Frontend passes those to `MiniKit.commandsAsync.sendTransaction`
4. User sees approval drawer in World App

**Frontend pattern:**
```tsx
import { MiniKit } from '@worldcoin/minikit-js';

async function handleStake(amount: string, lockDays: number) {
  // Step 1: Get tx params from your API
  const res = await fetch('/api/staking/stake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, lockDays }),
  });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  // Step 2: Send via MiniKit (user signs in World App)
  const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
    transaction: data.transactions, // array of tx objects
  });

  if (finalPayload.status === 'error') {
    console.error('Transaction failed', finalPayload);
    return;
  }

  // Step 3: Transaction submitted
  const txId = finalPayload.transaction_id;
  console.log('Transaction ID:', txId);
}
```

**API route returns tx params (already built):**
```ts
// /api/staking/stake returns:
{
  transactions: [
    {
      address: "0x...",           // contract address
      abi: StakingVaultABI,       // contract ABI
      functionName: "stake",
      args: ["1000000000000000000", "30"],
    }
  ]
}
```

**Important constraints:**
- Max 1M gas per transaction
- Contracts must be allowlisted in World Developer Portal
- Users get 500 free txs/day

### 3. Verify World ID (ZKP)

Used for sybil-resistant actions (airdrop claims). User generates ZK proof in World App, backend verifies via Cloud API.

**Frontend:**
```tsx
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';

async function handleClaim(airdropId: number) {
  // Step 1: User generates ZK proof
  const { finalPayload } = await MiniKit.commandsAsync.verify({
    action: 'claim-airdrop',          // Must match Developer Portal action
    signal: airdropId.toString(),      // Optional signal
    verification_level: VerificationLevel.Orb,
  });

  if (finalPayload.status !== 'success') {
    console.error('Verification failed');
    return;
  }

  // Step 2: Send proof to backend for verification + claim
  const res = await fetch('/api/airdrop/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      airdropId,
      proof: {
        merkle_root: finalPayload.merkle_root,
        nullifier_hash: finalPayload.nullifier_hash,
        proof: finalPayload.proof,
        verification_level: finalPayload.verification_level,
      },
      signal: airdropId.toString(),
      action: 'claim-airdrop',
    }),
  });

  const data = await res.json();
  if (data.success) {
    console.log('Claimed! TX:', data.txHash);
  }
}
```

**Backend verifies proof:**
```ts
import { verifyCloudProof } from '@worldcoin/minikit-js';

const verifyRes = await verifyCloudProof(
  payload,
  process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
  action,
  signal
);
```

**Gotcha:** Device-level verification is cloud-only. On-chain ZKP verification is Orb-only (`groupId = 1`).

### 4. CRE Relay (Backend → Chainlink CRE → Contract)

For operations the backend orchestrates (multi-step, cross-chain). Frontend just calls the API route; CRE does the work.

**Frontend:**
```tsx
const res = await fetch('/api/token/mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenAddress: '0x...',
    to: '0x...',
    amount: '1000000000000000000000',
    targetChain: 'arbitrum-sepolia',
  }),
});
const data = await res.json();
// { success: true, txHash: '0x...' }
```

**Backend relays to CRE:**
```ts
const creResponse = await fetch(process.env.CRE_WORKFLOW_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
```

---

## Which Pattern for Which Page

| Page | Read (GET) | Write | Pattern |
|------|-----------|-------|---------|
| `/airdrops` | `GET /api/airdrop/list` | Claim: verify + CRE relay | Pattern 3 + 4 |
| `/airdrops` create | — | `POST /api/airdrop/create` | Pattern 4 (backend wallet) |
| `/fair-launch` | `GET /api/launch/list` | Contribute: sendTransaction | Pattern 2 |
| `/staking` | `GET /api/staking/positions` | Stake/unstake: sendTransaction | Pattern 2 |
| `/portfolio` | `GET /api/portfolio` | — (read-only) | Pattern 1 |
| `/dashboards` | `GET /api/stats` | — (read-only) | Pattern 1 |
| `/payouts` | `GET /api/payouts/history` | Create: sendTransaction | Pattern 2 |
| `/vesting` | `GET /api/vesting/schedules` | Create/claim/revoke: sendTransaction | Pattern 2 |
| `/utilities/token-mint` | — | Mint: CRE relay | Pattern 4 |

---

## Wiring Checklist Per Page

### `/staking` (Pattern 2 — sendTransaction)

Current state: fetches from API, shows `alert()` instead of sending tx.
What to change:

```diff
- // In production: MiniKit.commandsAsync.sendTransaction for each tx
- alert(`Stake tx prepared: ${data.transactions.length} transactions`);
+ const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
+   transaction: data.transactions,
+ });
+ if (finalPayload.status === 'error') {
+   alert('Transaction failed');
+ } else {
+   alert(`Staked! TX: ${finalPayload.transaction_id}`);
+   fetchPositions();
+ }
```

Same pattern for unstake and claimRewards — replace `alert()` with `MiniKit.commandsAsync.sendTransaction`.

### `/airdrops` claim (Pattern 3+4 — verify + CRE)

Current state: sends placeholder proof `{ merkle_root: '0x0', ... }`.
What to change:

```diff
  async function handleClaim(airdropId: number) {
    setClaimingId(airdropId);
    try {
+     // Step 1: Get real ZK proof from user
+     const { finalPayload: verifyPayload } = await MiniKit.commandsAsync.verify({
+       action: 'claim-airdrop',
+       signal: airdropId.toString(),
+       verification_level: VerificationLevel.Orb,
+     });
+     if (verifyPayload.status !== 'success') {
+       alert('Verification failed');
+       return;
+     }
+
+     // Step 2: Send real proof to backend
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airdropId,
-         proof: { merkle_root: '0x0', nullifier_hash: '0x0', proof: '0x0', verification_level: 'device' },
+         proof: {
+           merkle_root: verifyPayload.merkle_root,
+           nullifier_hash: verifyPayload.nullifier_hash,
+           proof: verifyPayload.proof,
+           verification_level: verifyPayload.verification_level,
+         },
          signal: '',
          action: 'claim-airdrop',
        }),
      });
```

### `/fair-launch` contribute (Pattern 2 — sendTransaction)

```tsx
async function handleContribute(launchId: number, amount: string) {
  const res = await fetch('/api/launch/contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ launchId, amount }),
  });
  const data = await res.json();

  const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
    transaction: [data.transaction],
  });

  if (finalPayload.status === 'success') {
    console.log('Contributed! TX:', finalPayload.transaction_id);
  }
}
```

### `/dashboards` + `/portfolio` (Pattern 1 — read only)

Simple fetch + render. No MiniKit needed.

```tsx
const [stats, setStats] = useState(null);

useEffect(() => {
  fetch('/api/stats').then(r => r.json()).then(setStats);
}, []);
```

---

## Available Contract Addresses

All exported from `lib/contracts.ts`:

| Export | Env Var | Contract |
|--------|---------|----------|
| `HUMANDROP_ADDRESS` | `NEXT_PUBLIC_HUMANDROP_ADDRESS` | Airdrop vault |
| `FAIR_LAUNCH_ADDRESS` | `NEXT_PUBLIC_FAIR_LAUNCH_ADDRESS` | Token launches |
| `STAKING_VAULT_ADDRESS` | `NEXT_PUBLIC_STAKING_VAULT_ADDRESS` | Staking |
| `BATCH_PAYOUT_ADDRESS` | `NEXT_PUBLIC_BATCH_PAYOUT_ADDRESS` | Batch payouts |
| `VESTING_VAULT_ADDRESS` | `NEXT_PUBLIC_VESTING_VAULT_ADDRESS` | Vesting |
| `TOKEN_FACTORY_ADDRESS` | `NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS` | Token deployment |
| `MANNA_INDEX_ADDRESS` | `NEXT_PUBLIC_MANNA_INDEX_ADDRESS` | Protocol stats |
| `HDT_ADDRESS` | `NEXT_PUBLIC_HDT_ADDRESS` | Test ERC20 |
| `VERIFIER_ADDRESS` | `NEXT_PUBLIC_WORLD_ID_VERIFIER_ADDRESS` | Human registry |

---

## Available ABIs

Located in `src/abi/`:

| File | Contract | Key Functions |
|------|----------|---------------|
| `HumanDrop.json` | HumanDrop | createAirdrop, claim, isEligible, withdraw |
| `FairLaunch.json` | FairLaunch | createLaunch, contribute, finalize, getActiveLaunches |
| `StakingVault.json` | StakingVault | stake, unstake, claimRewards, getPositions |
| `BatchPayout.json` | BatchPayout | distribute, getPayouts |
| `VestingVault.json` | VestingVault | create, claim, revoke |
| `TokenFactory.json` | TokenFactory | deployToken |
| `MannaIndex.json` | MannaIndex | getStats, updateStats |
| `ERC20.json` | ERC20 | approve, transfer, balanceOf |

---

## Available API Routes

### Public (GET — no auth)

| Route | Returns |
|-------|---------|
| `GET /api/airdrop/list` | Active airdrops array |
| `GET /api/airdrop/eligibility?airdropId=&nullifierHash=` | `{ eligible: boolean }` |
| `GET /api/launch/list` | Active launches w/ bonding curve data |
| `GET /api/stats` | MannaIndex protocol stats |
| `GET /api/portfolio?wallet=` | Multi-chain balances |
| `GET /api/staking/positions?wallet=` | Staking positions array |
| `GET /api/payouts/history?wallet=` | Payout history array |
| `GET /api/vesting/schedules?wallet=` | Vesting schedules array |

### Auth-Guarded (POST — requires session)

| Route | Returns | Frontend Pattern |
|-------|---------|-----------------|
| `POST /api/airdrop/claim` | `{ txHash }` | Verify + CRE relay |
| `POST /api/airdrop/create` | `{ airdropId, txHash }` | CRE relay |
| `POST /api/token/mint` | `{ txHash }` | CRE relay |
| `POST /api/staking/stake` | `{ transactions: [...] }` | sendTransaction |
| `POST /api/staking/unstake` | `{ transaction: {...} }` | sendTransaction |
| `POST /api/staking/claim-rewards` | `{ transaction: {...} }` | sendTransaction |
| `POST /api/payouts/create` | `{ transactions: [...] }` | sendTransaction |
| `POST /api/vesting/create` | `{ transactions: [...] }` | sendTransaction |
| `POST /api/vesting/claim` | `{ transaction: {...} }` | sendTransaction |
| `POST /api/vesting/revoke` | `{ transaction: {...} }` | sendTransaction |
| `POST /api/launch/contribute` | `{ transaction: {...} }` | sendTransaction |

---

## Reusable Components

| Component | Path | Usage |
|-----------|------|-------|
| `<AuthGate>` | `components/AuthGate` | Wraps interactive sections, shows connect prompt |
| `<GlassCard>` | `components/GlassCard` | Card container w/ glass morphism |
| `<StatCard>` | `components/StatCard` | Stat display (label, value, change%) |
| `<TokenInput>` | `components/TokenInput` | Token amount input w/ balance display |
| `<AirdropCard>` | `components/AirdropCard` | Airdrop display w/ claim button |
| `<NavCard>` | `components/NavCard` | Navigation card for utility pages |
| `<Navbar>` | `components/Navbar` | Top bar w/ wallet connect/disconnect |
| `<BottomNav>` | `components/BottomNav` | Bottom tab navigation |
| `<AuthButton>` | `components/AuthButton` | Standalone login button (auto-auth) |
| `<UserInfo>` | `components/UserInfo` | Profile pic + username display |

---

## Safe Wallet Gotcha

The `session.user.walletAddress` is a **Safe smart contract address**, not an EOA. Standard `ecrecover` won't work for verifying signatures from this address. Use:
- `verifySiweMessage` from `@worldcoin/minikit-js` for SIWE (already used in auth)
- Signature verification goes through Safe's `isValidSignature` (EIP-1271)

This is already handled by the auth system — you don't need to worry about it unless building custom signature verification.
