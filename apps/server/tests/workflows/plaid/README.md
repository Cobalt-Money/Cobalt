# Plaid onboarding integration tests

Server-based integration tests for the Plaid onboarding streaming flow. Covers the bridge between `plaidInitialSyncWorkflow`, the `SYNC_UPDATES_AVAILABLE` webhook, and the progress stream the UI tails.

Tracked in [SRI-261](https://linear.app/sriket/issue/SRI-261/stream-plaid-onboarding-progress-to-ui-via-workflow-hook-stream).

For **manual UI-in-the-loop** validation (dev server + real Plaid Link + eyeballing the progress card), follow [SRI-263](https://linear.app/sriket/issue/SRI-263/manual-local-e2e-test-plaid-onboarding-progress-stream) instead — it has the env-var setup and the exact commands to fire the webhook after you connect.

## Prerequisites

1. **Docker + local Postgres**

   ```bash
   bun run db:local:up           # starts Postgres on 127.0.0.1:5433
   bun run db:migrate:local      # applies schema
   ```

2. **Plaid sandbox credentials** in `apps/server/.env`:

   ```
   PLAID_CLIENT_ID=<your-sandbox-client-id>
   PLAID_SECRET=<your-sandbox-secret>
   PLAID_ENV=sandbox
   ```

   Dashboard: https://dashboard.plaid.com/team/keys (use the Sandbox column).

3. **No ngrok needed.** The test fires the webhook by POSTing directly to the spawned Nitro at `http://localhost:4000/api/plaid/webhook`. It exercises the full handler (including `getHookByToken` → `resumeHook`) without requiring public tunneling.

## Run

```bash
cd apps/server

# Just the onboarding integration:
bun run test:integration tests/workflows/plaid/onboarding-sync.integration.test.ts

# All sad-path integrations (fast, ~10s each):
bun run test:integration

# Everything including happy-path (real AI cost):
bun run test:integration:all
```

First run spawns Nitro, which takes ~5–10s. Subsequent runs reuse it within the same vitest process.

## What the test proves

Given a sandbox Plaid item with a waiting onboarding workflow:

- Starting `plaidInitialSyncWorkflow` emits `connecting` then suspends on hook `plaid:sync:${itemId}`
- POSTing `SYNC_UPDATES_AVAILABLE` to our webhook → handler looks up the hook → resumes the existing run (does NOT start a new `plaidSyncWorkflow`)
- Resumed workflow runs accounts → balances → transactions → historical steps
- Progress stream emits phases in the order the UI depends on, then closes
- `run.returnValue` resolves `{ success: true, itemId }`
- DB has real `bank_account` rows from Plaid's sandbox response

## CI

**These do not run in CI.** Per `.agents/skills/cobalt/testing/SKILL.md`: integration tests depend on docker + real Plaid credentials and are manual tools for pre-release verification or when touching workflow / webhook bridge code.

## Troubleshooting

- **`Hook not found` when webhook fires**: increase the 500ms `setTimeout` before the webhook POST. Hook registration inside the workflow is async, and under load the first step may not have reached `createHook` yet. Symptom: the webhook falls through to `start(plaidSyncWorkflow)` instead of resuming.
- **`Nitro didn't report ready within 90s`**: docker likely isn't running, or local PG on 5433 is unreachable. `bun run db:local:up` and retry.
- **`INVALID_API_KEYS`**: sandbox creds missing or pointing at the wrong env. Check `PLAID_ENV=sandbox` and that the keys are the sandbox column, not development/production.
- **Rate limit (429) from Plaid**: sandbox limits are forgiving but not infinite. Back off or rotate creds.
- **Rows accumulating in local PG**: the test cleans up its own rows in `finally`, but if a run is killed mid-way you may have orphans. Manual cleanup:
  ```bash
  docker exec cobalt-local-db-postgres-1 psql -U postgres -d cobalt \
    -c "DELETE FROM bank_account WHERE plaid_item_id LIKE 'sandbox-%';
        DELETE FROM bank_connection WHERE plaid_item_id LIKE 'sandbox-%';"
  ```

## Related

- Unit tests for the same bridge: `apps/server/src/webhooks/plaid.test.ts`, `apps/server/src/workflows/plaid/sync/workflow.test.ts`
- Integration harness: `apps/server/tests/integration-spawn.ts`
- Skill reference: `.agents/skills/cobalt/testing/SKILL.md`
