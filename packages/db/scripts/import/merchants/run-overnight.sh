#!/usr/bin/env bash
# SRI-352 — overnight orchestrator: 3 importers parallel → dedup → rollup → domain-fill.
set -uo pipefail

cd "$(dirname "$0")/../../../../.."
mkdir -p logs

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
LOG=logs/sri-352-overnight.log
echo "[$(ts)] === SRI-352 overnight start ===" | tee -a "$LOG"

# --- Phase 1: importers in parallel ---
echo "[$(ts)] phase 1: importers" | tee -a "$LOG"
bun run packages/db/scripts/import/merchants/nyc-dohmh.ts      > logs/nyc-dohmh.log      2>&1 &
PID_NYC=$!
bun run packages/db/scripts/import/merchants/ny-retail-food.ts > logs/ny-retail-food.log 2>&1 &
PID_NY=$!
bun run packages/db/scripts/import/merchants/sf-dph.ts         > logs/sf-dph.log         2>&1 &
PID_SF=$!

wait $PID_NYC; echo "[$(ts)] nyc exit=$?"      | tee -a "$LOG"
wait $PID_NY;  echo "[$(ts)] ny-retail exit=$?" | tee -a "$LOG"
wait $PID_SF;  echo "[$(ts)] sf exit=$?"        | tee -a "$LOG"

# --- Phase 2: dedup ---
echo "[$(ts)] phase 2: dedup" | tee -a "$LOG"
bun run packages/db/scripts/import/merchants/dedup-locations.ts >> logs/dedup.log 2>&1
echo "[$(ts)] dedup exit=$?" | tee -a "$LOG"

# --- Phase 3: rollup ---
echo "[$(ts)] phase 3: rollup" | tee -a "$LOG"
bun run packages/db/scripts/import/merchants/rollup-merchants.ts >> logs/rollup.log 2>&1
echo "[$(ts)] rollup exit=$?" | tee -a "$LOG"

# --- Phase 4: domain-fill (longest) ---
echo "[$(ts)] phase 4: domain-fill" | tee -a "$LOG"
bun run packages/db/scripts/import/merchants/domain-fill.ts >> logs/domain-fill.log 2>&1
echo "[$(ts)] domain-fill exit=$?" | tee -a "$LOG"

echo "[$(ts)] === SRI-352 overnight DONE ===" | tee -a "$LOG"
