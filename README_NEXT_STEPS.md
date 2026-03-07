# Next Steps — Manna Protocol

Complete handoff guide for finishing implementation and deployment.

---

## 📊 Current Status

### ✅ Completed (95%)

**Smart Contracts** — 9 contracts, 88 tests passing
- HumanDrop.sol + isEligible()
- FairLaunch.sol + getActiveLaunches()
- TokenFactory.sol
- MannaToken.sol
- MannaIndex.sol (NEW)
- StakingVault.sol
- VestingVault.sol
- BatchPayout.sol
- WorldIDVerifier.sol

**CRE Workflows** — 8 workflows (4 new)
- main.ts (airdrop claim)
- token-mint.ts (NEW)
- token-deploy.ts
- airdrop-create.ts
- airdrop-reclaim.ts (NEW — Cron 6h)
- portfolio-aggregate.ts (NEW)
- stats-sync.ts (NEW — Cron 10min)
- fair-launch-finalize.ts (Cron 5min)

**Documentation**
- DEPLOYMENT.md — full deployment sequence
- API_SPEC.md — 10 API routes with implementations
- CLAUDE.md — updated with new features
- tasks/todo.md — Phase 6 complete, Phase 7 tracked

---

## ⚠️ Critical Gap: API + Frontend Integration (0%)

### What's Missing

The **protocol layer** (contracts + CRE) is 95% complete.
The **integration layer** (API + UI) is 0% complete.

**Impact:** Users can't interact with deployed contracts from frontend.

---

## 🎯 Required Work

### 1. Backend API Routes (10 routes, ~3-4h)

See `API_SPEC.md` for full implementations. All routes are copy-paste ready.

#### Create These Files:

```
manna_app/src/app/api/
├── auth/wallet/route.ts              # NEW — JWT session from World App
├── airdrop/eligibility/route.ts      # NEW — call isEligible()
├── launch/list/route.ts              # NEW — call getActiveLaunches()
├── token/mint/route.ts               # NEW — trigger token-mint.ts
├── portfolio/route.ts                # NEW — trigger portfolio-aggregate.ts
├── stats/route.ts                    # NEW — read MannaIndex.getStats()
├── staking/
│   ├── stake/route.ts                # NEW — call StakingVault.stake()
│   ├── unstake/route.ts              # NEW — call StakingVault.unstake()
│   └── positions/route.ts            # NEW — call StakingVault.getPositions()
└── payouts/
    ├── create/route.ts               # NEW — call BatchPayout.distribute()
    └── history/route.ts              # NEW — call BatchPayout.getPayouts()
```

**Time:** 3-4h (all implementations in API_SPEC.md)

---

### 2. Frontend Integration (6 pages, ~4-5h)

#### `/airdrops` — Add Eligibility Check
**Current:** Shows all airdrops, claim button always enabled
**Needed:** Call `/api/airdrop/eligibility` before showing claim button

```typescript
// manna_app/src/app/(protected)/airdrops/page.tsx
const checkEligibility = async (airdropId: number) => {
  const res = await fetch(`/api/airdrop/eligibility?airdropId=${airdropId}&nullifierHash=${userNullifier}`);
  const { eligible } = await res.json();
  return eligible;
};
```

**Time:** 30min

---

#### `/fair-launch` — Replace Placeholder
**Current:** "Coming soon" placeholder
**Needed:** Call `/api/launch/list` and display launch cards with contribute flow

```typescript
// manna_app/src/app/(protected)/fair-launch/page.tsx
const [launches, setLaunches] = useState([]);

useEffect(() => {
  fetch('/api/launch/list')
    .then(res => res.json())
    .then(data => setLaunches(data.launches));
}, []);

// Render launch cards with contribute button
```

**Time:** 1-2h

---

#### `/utilities/token-mint` — Add Deployment Form
**Current:** Page doesn't exist
**Needed:** Form to deploy ERC20 via TokenFactory

```typescript
// manna_app/src/app/(protected)/utilities/token-mint/page.tsx
const handleDeploy = async () => {
  const res = await fetch('/api/token/mint', {
    method: 'POST',
    body: JSON.stringify({
      tokenAddress, to, amount, targetChain
    }),
  });
  const { txHash } = await res.json();
};
```

**Time:** 1h

---

#### `/staking` — Wire Real Positions
**Current:** Demo data only
**Needed:** Call `/api/staking/positions` and enable stake/unstake

```typescript
// manna_app/src/app/(protected)/staking/page.tsx
const [positions, setPositions] = useState([]);

useEffect(() => {
  fetch(`/api/staking/positions?wallet=${userWallet}`)
    .then(res => res.json())
    .then(data => setPositions(data.positions));
}, []);
```

**Time:** 1h

---

#### `/dashboards` — Show Live Stats
**Current:** Empty or demo data
**Needed:** Call `/api/stats` and display MannaIndex stats

```typescript
// manna_app/src/app/(protected)/dashboards/page.tsx
const [stats, setStats] = useState(null);

useEffect(() => {
  fetch('/api/stats')
    .then(res => res.json())
    .then(setStats);
}, []);

// Render stats cards
```

**Time:** 30min

---

#### `/portfolio` — Multi-Chain Balances
**Current:** Empty or demo data
**Needed:** Call `/api/portfolio` via CRE workflow

```typescript
// manna_app/src/app/(protected)/portfolio/page.tsx
const [balances, setBalances] = useState([]);

useEffect(() => {
  fetch(`/api/portfolio?wallet=${userWallet}`)
    .then(res => res.json())
    .then(data => setBalances(data.balances));
}, []);
```

**Time:** 1h

---

### 3. Auth Middleware (1-2h)

**Create JWT auth for protected routes:**

```typescript
// manna_app/src/middleware.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token');

  if (!token) {
    return NextResponse.redirect('/login');
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect('/login');
  }
}

export const config = {
  matcher: ['/api/staking/:path*', '/api/payouts/:path*'],
};
```

**Time:** 1-2h

---

### 4. Contract Deployment (1h)

See `DEPLOYMENT.md` for full sequence.

**Steps:**
1. Deploy all contracts to World Chain, Arb Sepolia, Base Sepolia
2. Update all `workflow/*.config.staging.json` with deployed addresses
3. Set CRE operator on all contracts via `cast send`
4. Deploy 8 CRE workflows via `cre workflow deploy`
5. Set VaultDON secrets (World ID API key)
6. Update `manna_app/.env.local` with contract addresses + CRE URLs

**Time:** 1h (scripted)

---

### 5. E2E Testing (1h)

**Test complete flow:**
1. User logs into Mini App (World App)
2. Browse airdrops → check eligibility → claim
3. Browse launches → contribute
4. View portfolio across chains
5. Stake tokens
6. View dashboard stats

**Verify:**
- Transactions visible in block explorer
- CRE logs show workflow execution
- Contract state updated correctly
- UI reflects real data

**Time:** 1h

---

## 📋 Quick Start Checklist

### For Human Developer

- [ ] Create 10 API routes (copy from API_SPEC.md)
- [ ] Wire 6 frontend pages to API routes
- [ ] Add JWT auth middleware
- [ ] Deploy contracts (follow DEPLOYMENT.md)
- [ ] Deploy CRE workflows
- [ ] Update .env.local with addresses
- [ ] E2E test one complete flow
- [ ] Record demo video

**Total Time:** ~10-12 hours

---

### For Claude Code

- [ ] Help debug API route issues
- [ ] Assist with frontend integration bugs
- [ ] Review contract deployment output
- [ ] Help troubleshoot CRE workflow errors
- [ ] Suggest UI/UX improvements
- [ ] Help optimize gas usage if needed

---

## 🚀 Deployment Sequence

**1. Contracts First (1h)**
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $WORLD_CHAIN_RPC --broadcast
# Repeat for Arb Sepolia, Base Sepolia
# Save all deployed addresses
```

**2. Update Configs (15min)**
```bash
cd workflow
# Update all *.config.staging.json files with deployed addresses
```

**3. Deploy CRE Workflows (30min)**
```bash
cre workflow deploy --workflow-file token-mint.workflow.yaml --environment staging
cre workflow deploy --workflow-file airdrop-reclaim.workflow.yaml --environment staging
cre workflow deploy --workflow-file portfolio-aggregate.workflow.yaml --environment staging
cre workflow deploy --workflow-file stats-sync.workflow.yaml --environment staging
# Deploy remaining 4 workflows
```

**4. Set Operator on Contracts (15min)**
```bash
export CRE_OPERATOR=0x_from_workflow_deployment
cast send $HUMANDROP_ADDRESS "setOperator(address,bool)" $CRE_OPERATOR true --rpc-url $WORLD_CHAIN_RPC
# Repeat for all contracts on all chains
```

**5. Build API Routes (3-4h)**
```bash
cd manna_app
# Create 10 API route files from API_SPEC.md
```

**6. Wire Frontend (4-5h)**
```bash
# Update 6 pages to use real API data
```

**7. Test E2E (1h)**
```bash
npm run dev
# Test complete user flows
```

---

## 📁 File Reference

| File | What It Contains | Who Needs It |
|------|------------------|--------------|
| `DEPLOYMENT.md` | Step-by-step deployment guide | Human (deploy contracts + CRE) |
| `API_SPEC.md` | 10 API routes with full implementations | Human (copy-paste API routes) |
| `CLAUDE.md` | Updated architecture + feature list | Both (reference) |
| `tasks/todo.md` | Phase 6 ✅, Phase 7 checklist | Both (track progress) |
| `README_NEXT_STEPS.md` | This file — handoff guide | Both (next actions) |

---

## 🎯 Success Criteria

**Minimum Viable Demo:**
- [ ] User can claim airdrop via Mini App
- [ ] User can view active launches
- [ ] User can contribute to launch
- [ ] User can view portfolio across 3 chains
- [ ] Dashboard shows live protocol stats
- [ ] All CRE workflows running (visible in logs)
- [ ] Contracts deployed + verified on explorers

**Time to MVP:** 10-12 hours from current state

---

## 💡 Tips

### For Faster Integration
1. Start with `/api/stats` (simplest, no CRE)
2. Then `/api/launch/list` (read-only contract call)
3. Then `/api/airdrop/eligibility` (read-only)
4. Leave staking/payouts for last (more complex)

### For Debugging
- Use CRE CLI to check workflow logs: `cre workflow logs --workflow-id <id>`
- Check contract events on block explorer
- Test workflows via `cre workflow simulate` before deploying
- Use Tenderly Debugger for failed transactions

### For Demo Video
- Focus on: claim flow, launch contribute, portfolio view, stats dashboard
- Show World ID verification step
- Highlight CRE automation (cron jobs running)
- Show transactions on block explorer

---

## ❓ Questions?

**Claude Code can help with:**
- Debugging API route errors
- Frontend integration issues
- Contract interaction problems
- CRE workflow syntax errors
- TypeScript type errors
- Gas optimization

**Human should handle:**
- Deployment to production
- Setting up Tenderly Virtual TestNet
- World ID app configuration
- CRE account setup
- Recording demo video
- Submission form

---

## 🎬 Final Checklist

Before submission:
- [ ] All 88 tests passing
- [ ] All 8 CRE workflows deployed
- [ ] All contracts deployed to 3 chains
- [ ] 10 API routes working
- [ ] 6 frontend pages showing real data
- [ ] E2E flow tested (airdrop claim works)
- [ ] Demo video recorded (3-5 min)
- [ ] README updated with deployed addresses
- [ ] Submission form completed

---

**You're 95% done. Just need the integration layer.**

Good luck! 🚀
