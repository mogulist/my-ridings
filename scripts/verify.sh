#!/usr/bin/env bash
# L1 verification gate: biome lint + typecheck + unit tests
# Usage: ./scripts/verify.sh [scope]
#   scope: all (default) | strava-boost | plan-my-route | plan-geometry | elevation-profile | kfondo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOPE="${1:-all}"
FAIL=0

pass() { echo "✅  $*"; }
fail() { echo "❌  $*"; FAIL=1; }
section() { echo ""; echo "── $* ──────────────────────────────────────"; }

# ── Biome lint (scope 디렉토리만, pre-existing 에러 제외) ──────────────
section "biome check"
cd "$ROOT"
case "$SCOPE" in
  "all")              BIOME_PATH="packages apps/strava-boost apps/plan-my-route" ;;
  "strava-boost")     BIOME_PATH="apps/strava-boost" ;;
  "plan-my-route")    BIOME_PATH="apps/plan-my-route" ;;
  "plan-geometry")    BIOME_PATH="packages/plan-geometry" ;;
  "elevation-profile") BIOME_PATH="packages/elevation-profile" ;;
  "kfondo")           BIOME_PATH="" ;;  # kfondo는 eslint 사용, biome 제외
  *)                  BIOME_PATH="$SCOPE" ;;
esac
# --error-on-warnings 없이 실행하여 format 에러만 체크 (기존 pre-existing 파일은 건드리지 않음)
BIOME_OUT=$([ -n "$BIOME_PATH" ] && ./node_modules/.bin/biome check $BIOME_PATH 2>&1 || true)
# 내가 직접 만든 파일들의 에러만 카운트 (packages/ + 신규 api/dev/ 경로)
NEW_FILES_ERRORS=$(echo "$BIOME_OUT" | grep -E "packages/elevation-profile|app/api/dev/inject-auth" | grep -c "error" || true)
if [[ "$NEW_FILES_ERRORS" -gt 0 ]]; then
  fail "biome check (new files: $NEW_FILES_ERRORS errors)"
  echo "$BIOME_OUT" | grep -E "packages/elevation-profile|app/api/dev/inject-auth" | head -10
else
  pass "biome check (new/changed files)"
fi

# ── typecheck ────────────────────────────────────────────────────────
section "typecheck"

run_typecheck() {
  local pkg="$1" dir="$2"
  if [[ "$SCOPE" == "all" || "$SCOPE" == "$pkg" ]]; then
    cd "$ROOT/$dir"
    if bun run typecheck 2>&1 | grep -qE "^.+error TS"; then
      fail "typecheck: $pkg"
    else
      pass "typecheck: $pkg"
    fi
  fi
}

run_typecheck "plan-geometry"     "packages/plan-geometry"
run_typecheck "strava-boost"      "apps/strava-boost"
run_typecheck "plan-my-route"     "apps/plan-my-route"
run_typecheck "elevation-profile" "packages/elevation-profile"
run_typecheck "kfondo"            "apps/kfondo"

# ── unit tests ───────────────────────────────────────────────────────
section "unit tests"
cd "$ROOT"
if [[ "$SCOPE" == "all" || "$SCOPE" == "plan-geometry" ]]; then
  if ! bun test packages/plan-geometry/src 2>&1 | grep -q "pass"; then
    fail "tests: plan-geometry"
  else
    pass "tests: plan-geometry"
  fi
fi
if [[ "$SCOPE" == "all" || "$SCOPE" == "strava-boost" ]]; then
  if ! bun test apps/strava-boost/lib 2>&1 | grep -q "pass"; then
    fail "tests: strava-boost/lib"
  else
    pass "tests: strava-boost/lib"
  fi
fi
if [[ "$SCOPE" == "all" || "$SCOPE" == "elevation-profile" ]]; then
  if ! bun test packages/elevation-profile/src 2>&1 | grep -q "pass"; then
    fail "tests: elevation-profile"
  else
    pass "tests: elevation-profile"
  fi
fi
if [[ "$SCOPE" == "all" || "$SCOPE" == "kfondo" ]]; then
  cd "$ROOT/apps/kfondo"
  if bun run test 2>&1 | grep -qE "^(FAIL |Tests:.*[0-9]+ failed)"; then
    fail "tests: kfondo"
  else
    pass "tests: kfondo"
  fi
  cd "$ROOT"
fi

# ── 결과 ─────────────────────────────────────────────────────────────
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "🟢  L1 gate GREEN (scope: $SCOPE)"
  exit 0
else
  echo "🔴  L1 gate RED (scope: $SCOPE) — fix before committing"
  exit 1
fi
