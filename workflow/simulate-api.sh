#!/usr/bin/env bash
#
# Manna Protocol — API Integration Test
# Tests all 8 CRE workflow equivalents via Next.js API routes.
# Requires: npm run dev running in manna_app/ on port 3000
#
# Usage: bash workflow/simulate-api.sh
#

set -euo pipefail

BASE="http://localhost:3000"
WALLET="0x53cFee9b964ccc90003f02fb8e0b0985071F4002"
HDT="0x01768ffFb5E313915aDFe93b6a4369B4ef9991CB"
PASS=0
FAIL=0

green() { echo -e "\033[32m$1\033[0m"; }
red() { echo -e "\033[31m$1\033[0m"; }

check() {
  local name="$1" resp="$2"
  if echo "$resp" | grep -q '"success":true\|"success": true'; then
    green "  ✓ $name"
    PASS=$((PASS + 1))
  elif echo "$resp" | grep -q '"wallet"\|"balances"\|"totalAirdrops"'; then
    # Read endpoints return data, not { success: true }
    green "  ✓ $name"
    PASS=$((PASS + 1))
  else
    red "  ✗ $name"
    echo "    Response: $(echo "$resp" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Manna Protocol — API Integration Test               ║"
echo "║     Testing CRE workflow equivalents via Next.js routes  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Check if server is running
if ! curl -sf "$BASE" > /dev/null 2>&1; then
  red "ERROR: Next.js dev server not running on $BASE"
  echo "Run: cd manna_app && npm run dev"
  exit 1
fi

# ── 1. TOKEN-DEPLOY (workflow: token-deploy) ─────────────────────────
echo "[1/10] TOKEN-DEPLOY"
RESP=$(curl -sf -X POST "$BASE/api/token/deploy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ApiTestToken",
    "symbol": "ATT",
    "initialSupply": "1000000",
    "decimals": 18,
    "enableMinting": true
  }' 2>&1 || echo '{"error":"request failed"}')
check "POST /api/token/deploy" "$RESP"
TOKEN_ADDR=$(echo "$RESP" | grep -o '"tokenAddress":"0x[a-fA-F0-9]*"' | head -1 | cut -d'"' -f4 || echo "$HDT")

# ── 2. TOKEN-MINT (workflow: token-mint) ──────────────────────────────
echo "[2/10] TOKEN-MINT"
RESP=$(curl -sf -X POST "$BASE/api/token/mint" \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenAddress\": \"$HDT\",
    \"to\": \"$WALLET\",
    \"amount\": \"100\"
  }" 2>&1 || echo '{"error":"request failed"}')
check "POST /api/token/mint" "$RESP"

# ── 3. AIRDROP-CREATE (workflow: airdrop-create) ─────────────────────
echo "[3/10] AIRDROP-CREATE"
RESP=$(curl -sf -X POST "$BASE/api/airdrop/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$HDT\",
    \"amountOrb\": \"10\",
    \"amountDevice\": \"5\",
    \"maxClaims\": 50,
    \"expiryDays\": 1
  }" 2>&1 || echo '{"error":"request failed"}')
check "POST /api/airdrop/create" "$RESP"

# ── 4. AIRDROP-ELIGIBILITY (part of claim workflow) ──────────────────
echo "[4/10] AIRDROP-ELIGIBILITY"
RESP=$(curl -sf "$BASE/api/airdrop/eligibility?airdropId=0&nullifierHash=12345" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/airdrop/eligibility" "$RESP"

# ── 5. CLAIM (workflow: claim) ───────────────────────────────────────
echo "[5/10] CLAIM"
RESP=$(curl -sf -X POST "$BASE/api/airdrop/claim" \
  -H "Content-Type: application/json" \
  -d '{
    "airdropId": 0,
    "proof": {
      "merkle_root": "0x0",
      "nullifier_hash": "0x0",
      "proof": "0x0",
      "verification_level": "orb"
    },
    "signal": "",
    "action": "claim-airdrop"
  }' 2>&1 || echo '{"error":"request failed"}')
check "POST /api/airdrop/claim" "$RESP"

# ── 6. PORTFOLIO (workflow: portfolio-aggregate) ─────────────────────
echo "[6/10] PORTFOLIO"
RESP=$(curl -sf "$BASE/api/portfolio?wallet=$WALLET" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/portfolio" "$RESP"

# ── 7. STATS-SYNC (workflow: stats-sync cron) ────────────────────────
echo "[7/10] STATS-SYNC"
RESP=$(curl -sf "$BASE/api/cron/stats-sync" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/cron/stats-sync" "$RESP"

# ── 8. FINALIZE (workflow: fair-launch-finalize cron) ────────────────
echo "[8/10] FAIR-LAUNCH-FINALIZE"
RESP=$(curl -sf "$BASE/api/cron/finalize" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/cron/finalize" "$RESP"

# ── 9. RECLAIM (workflow: airdrop-reclaim cron) ──────────────────────
echo "[9/10] AIRDROP-RECLAIM"
RESP=$(curl -sf "$BASE/api/cron/reclaim" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/cron/reclaim" "$RESP"

# ── 10. VERIFY — read stats + list airdrops ──────────────────────────
echo "[10/10] VERIFY"
RESP=$(curl -sf "$BASE/api/stats" 2>&1 || echo '{"error":"request failed"}')
check "GET /api/stats" "$RESP"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  green "  All $TOTAL tests passed!"
else
  red "  $PASS/$TOTAL passed, $FAIL failed"
fi
echo "════════════════════════════════════════════"

exit "$FAIL"
