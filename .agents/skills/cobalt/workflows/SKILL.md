---
name: Cobalt — Workflows
description: How to structure Vercel Workflow (WDK) features in apps/server — thin workflow.ts, one concern per "use step", server-data for DB only, colocated lib mappers. Load when adding or refactoring durable workflows, Plaid/SnapTrade sync, or webhook-driven jobs.
version: 1.0.0
tags:
  - cobalt
  - workflows
  - vercel-workflow
  - apps-server
---

# Workflows (Cobalt)

Reference layout and rules for **`apps/server/src/workflows/**`**. Complements the generic **`.agents/skills/workflow/SKILL.md`** (WDK APIs); this doc is **where files go** and **how to split steps\*\* in this repo.

## Folder layout (per feature)

Under a domain folder (e.g. `plaid/liabilities/`):

| File                    | Responsibility                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`workflow.ts`**       | **`"use workflow"`** only: orchestration, branching, **`Promise.all`** for independent work, top-level **`try` / `catch`** with shared error reporting (e.g. `captureWorkflowExceptionStep`). |
| **`steps.ts`**          | Exported functions, each ending with **`"use step"`**. Fetch steps call **server-data actions** + apply retry/skip policy; persist steps call **server-data mutations** after mapping.        |
| **`lib.ts`** (optional) | Pure mappers: vendor DTO → Drizzle insert/upsert row shapes. No `"use step"`, no workflow imports.                                                                                            |

Shared steps (e.g. `getPlaidItemStep`) live in **`../sync/steps`** or **`workflows/shared/`** when reused.

## `packages/server-data`

Mirror the provider integration inside server-data with three file types per domain (e.g. `plaid/investments/`, `snaptrade/holdings/`):

| File                    | Responsibility                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`actions.ts`**        | Thin SDK wrappers (`plaidClient.*`, `snaptradeClient.*`). Fetch and return; throw raw provider errors. **No** workflow runtime deps. |
| **`mutations.ts`**      | DB writes only (Drizzle `insert` / `update` / `onConflictDoUpdate`).                                                                 |
| **`queries.ts`**        | DB reads only.                                                                                                                       |
| **`lib.ts`** (optional) | Pure mappers / helpers.                                                                                                              |

Rules:

- **No** `"use workflow"` / `"use step"` directives in server-data.
- **No** `RetryableError` / `FatalError` imports from `workflow` in server-data. Retry/skip policy lives in the _step_, not the action.
- Workflow steps call actions; API routes can also call the same actions. They're reusable, not workflow-specific.

## Workflow file (`workflow.ts`)

- Put **`"use workflow"`** on each exported async function. **Do not** add a file-level `"use workflow"` at the top of the module — function-level is sufficient and avoids bundler quirks. If every export in the file is a workflow, still use function-level directives; don't hoist.
- Read like a script: resolve inputs → fetch → early return on skip → persist in order → return a **small** result type (`success`, ids, optional `error` string).
- **Do not** add **`actions: string[]`** or other narrative bookkeeping on results.
- **Do not** add noisy per-step workflow loggers; rely on platform/workflow observability unless product asks for structured logs.

## Steps file (`steps.ts`)

### Granularity

- **One durable step per meaningful unit:** e.g. one step for **fetch** (single vendor call + its error/skip policy), separate steps for **each persist concern** (accounts, balances, credit / mortgage / student) so retries and failures are scoped.
- **Fetch steps** return explicit types; use a **discriminated union** when the flow can skip without error (e.g. `{ skipped: true }` vs `{ skipped: false; …payload }`).
- **Persist steps** accept **already-fetched** data + ids; map with **`lib.ts`**, then call one or a small set of server-data mutations.

### External APIs

- **Fetch steps call actions, not SDKs directly.** The raw `plaidClient.*` / `snaptradeClient.*` call lives in **`server-data/<domain>/actions.ts`**; the fetch step wraps the action with `"use step"` + the skip/retry classifier. Benefits: actions are reusable from API routes and scripts; server-data has no `workflow` runtime dependency.
- Handle vendor-specific **skip** vs **retry** (e.g. `RetryableError` for rate limits, `FatalError` for missing records) inside the **fetch step**, not in the workflow body beyond branching on `skipped`.
- Classifier pattern: look at the provider error body, decide `{ kind: "skip", reason }` for expected-miss codes, `throw new RetryableError(...)` for 429/5xx, otherwise rethrow.

### Webhook-driven fetches

Provider webhooks (Plaid, SnapTrade, Stripe, …) are **notifications, not payloads**. The body has counts / ids / flags — never the actual data. Implications:

- The fetch step must call the provider API to pull current state. Don't persist anything from the webhook body except the trigger (e.g. `item_id`).
- This is **why** `fetchHoldingsStep` exists even though a `HOLDINGS/DEFAULT_UPDATE` webhook arrived: the webhook only carries `new_holdings`/`updated_holdings` counts.
- Treat webhooks as replay-prone. A refetching fetch step is idempotent under retries and tolerates dropped/duplicated webhooks — the next one converges to truth.

### Parallelism

- Use **`Promise.all`** in the **workflow** for independent persist steps after fetch; keep each participant as its own **`"use step"`** function.

## Naming

- **Workflow:** `domainActionWorkflow` (e.g. `plaidLiabilitiesSyncWorkflow`).
- **Steps:** `verbNounStep` (e.g. `fetchPlaidLiabilitiesStep`, `persistPlaidCreditLiabilitiesStep`).
- **Actions** (in server-data): `verbNoun` — **no** `Step` suffix (e.g. `fetchHoldings`, `getUserAccountBalance`). They're not steps.
- **Mutations** (in server-data): `verbNoun` — **no** `FromWebhook` / `FromCron` / caller-suffix. Mutations are named by what they do, not who calls them. A webhook-triggered workflow, a cron, and an API route can all call the same `upsertBrokerageAccount`.
- **Filenames:** prefer `workflow.ts`, `steps.ts`, `lib.ts` in workflows; `actions.ts`, `mutations.ts`, `queries.ts`, `lib.ts` in server-data. Avoid redundant suffixes like `-workflow.ts` in the middle of the tree.
- **Folder pitfall:** never give two folders the same name if they do different things. Past mistake: `server-data/snaptrade/` (ingress: SDK + mutations) vs `server-data/brokerage/snaptrade/` (egress: read models for the client) — only the parent path distinguishes them, which is not self-documenting. Pick names that encode the data-flow direction (`integrations/`, `domain/`, etc.) or the concern.

## Persistence patterns (in server-data mutations)

Bulk upserts called from persist steps should follow this shape:

```ts
const BATCH_SIZE = 100;

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  await db
    .insert(table)
    .values(batch)
    .onConflictDoUpdate({
      set: {
        fieldA: sql`excluded.field_a`,
        fieldB: sql`excluded.field_b`,
        updatedAt: new Date(),
      },
      target: table.uniqueCol,
    });
}
```

Rules:

- **Batch to ~100 rows.** Postgres caps bind parameters at 65,535 per statement. A single "insert everything" call can exceed this on large syncs (~3k rows × 20 cols).
- **Use `` sql`excluded.col` ``, not JS values, in the `set:` clause.** `excluded` is Postgres's per-row alias for the incoming batch row. Using a JS value would overwrite every conflicting row with the same value.
- **A single constant (e.g. `updatedAt: new Date()`) can stay as a JS value** — intentional because the whole batch gets the same "touched at" timestamp.
- **Anti-pattern:** `try { bulkInsert } catch { for (row of rows) rowInsert }`. The "happy path" (bulk insert without `onConflict`) breaks on every conflict, so you fall into the per-row path every run. Use batched `onConflictDoUpdate` from the start.
- Require a **unique constraint** on the `target` column(s). "Match-first upsert" patterns (`SELECT then UPDATE or INSERT`) have a TOCTOU race under concurrent webhooks — add the constraint and use `onConflictDoUpdate`.

## Reference implementations

- **Workflow shape:** `apps/server/src/workflows/plaid/liabilities/` — `workflow.ts` orchestrates `getPlaidItemStep` → `fetchPlaidLiabilitiesStep` → conditional persist steps (including `Promise.all` for liability flavors).
- **Action + step split:** `apps/server/src/workflows/plaid/investments/steps.ts` calls `fetchHoldings` from `packages/server-data/src/plaid/investments/actions.ts`. The step owns `classifyPlaidError` / `RetryableError`; the action is a thin SDK wrapper.
- **Batched upsert (gold standard):** `packages/server-data/src/plaid/investments/mutations.ts` — 100-row batches + `sql\`excluded.x\``.

When adding a new integration workflow, copy the **shape** from these; only diverge if the domain truly needs a different split.
