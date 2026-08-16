#!/usr/bin/env bash

set -euo pipefail

worker_url="${SANDBOX_SMOKE_URL:-https://cobalt-sri-359-sandbox-validation.sriketk5.workers.dev}"

npx wrangler whoami
docker info >/dev/null
npm ci
npm test
npm run check-types
npx wrangler deploy --dry-run
npx wrangler deploy

token="$(openssl rand -hex 32)"
printf '%s' "$token" | npx wrangler secret put SMOKE_AUTH_TOKEN >/dev/null

# Secret versions take a few seconds to propagate globally.
sleep 5

SANDBOX_SMOKE_URL="$worker_url" \
  SANDBOX_SMOKE_TOKEN="$token" \
  bun run scripts/smoke.ts
