---
name: Cobalt — Testing
description: Where unit and integration tests live, what to mock vs run for real, how to verify DB-shape drift, and how the server-based integration harness works. Load when adding tests, refactoring test infra, or debugging a flaky integration run.
version: 1.0.0
tags:
  - cobalt
  - testing
  - vitest
  - integration
---

# Testing (Cobalt)

Conventions for **unit** and **integration** tests in this repo. Complements the generic `.agents/skills/test-driven-development/SKILL.md` (TDD philosophy); this doc is **where files go**, **what to mock**, and **which harness to use**.

## File layout

### Unit tests — co-located

Write unit tests **next to the source file they exercise**, using the `.test.ts` suffix.

```
packages/server-data/src/news/events/
  lib.ts
  lib.test.ts         # co-located
  mutations.ts
  mutations.test.ts   # co-located
```

Why: PR diffs show change + test together, renames/moves are atomic, import paths stay relative. Never create a mirrored `/tests/` tree — that's a Java/Maven convention that leaked into older JS projects and there's no reason to pay its navigation cost.

### Integration tests — separate, different config

Integration tests that need a real server / real DB / real external services go in `tests/` with `.integration.test.ts` suffix:

```
apps/server/
  tests/
    integration-spawn.ts                           # globalSetup (spawns Nitro)
    workflows/news/
      financial-events.integration.test.ts         # sad path (cheap)
      financial-events.happy.integration.test.ts   # happy path (real AI cost)
  vitest.config.ts               # unit test runner (excludes *.integration.test.ts)
  vitest.integration.config.ts   # integration runner (includes only *.integration.test.ts)
```

Separate config because integration tests need:

- A different include/exclude pattern
- The `workflow/vite` plugin for SWC transforms of `"use workflow"` / `"use step"` directives
- A `globalSetup` to spawn the Nitro dev server
- Different env vars (`WORKFLOW_LOCAL_BASE_URL`, `LOCAL_DATABASE_URL`) injected via `test.env`
- Longer `testTimeout`

The unit config must explicitly **exclude** `**/*.integration.test.ts` — otherwise `bun run test` tries to run them without the workflow transform plugin and fails with `'start' received an invalid workflow function`.

## Unit test rules

### Mock at system boundaries, not internals

| Boundary                                               | Mock strategy                                                                                                                                                               | Example                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `fetch` (HTTP)                                         | `vi.mock("node:fetch")` or override `globalThis.fetch`                                                                                                                      | Agent tests                  |
| AI SDK (`generateText`)                                | `vi.mock("ai", … importActual + override)`                                                                                                                                  | Agent tests                  |
| DB (`@cobalt-web/db`)                                  | **Don't mock.** Extract the pure shape-transform helper into `lib.ts` and unit-test _that_. Mock-the-Drizzle-chain tests fall apart quickly and become fragile mock setups. |
| Workflow runtime (`getStepMetadata`, `RetryableError`) | `vi.mock("workflow", … importActual + override)` so `instanceof` still works                                                                                                | Step tests                   |
| Other cross-workspace modules                          | `vi.mock` with `importActual` so enums / error classes stay real                                                                                                            | Workflow orchestration tests |

### Shape-validate DB writes via `createInsertSchema`

The best regression net for "did the schema drift out from under the mutation layer" is to round-trip the mutation's output through Drizzle-Zod:

```ts
import { eventArticles } from "@cobalt-web/db/schema/features";
import { createInsertSchema } from "drizzle-orm/zod";

const eventArticleInsertSchema = createInsertSchema(eventArticles);

it("produces a row that parses against the event_articles insert schema", () => {
  const row = toEventArticleInsertRow(FIXED_ID, processed(article()));
  expect(() => eventArticleInsertSchema.parse(row)).not.toThrow();
});
```

If a column is added/renamed/retyped and the mapper isn't updated, this test fails with the exact offending field in the Zod error. Fast feedback, zero DB required.

Rule of thumb: **every mutation that produces a DB-row shape should have its transform helper extracted to `lib.ts` and tested this way.** Mutations that are "thin wrappers around `db.insert()`" don't need dedicated tests — the shape test covers the one thing that can go wrong, and the Drizzle call itself is exercised by integration.

### Complete mocks, not partial

Per `.agents/skills/test-driven-development/testing-anti-patterns.md`: mirror the real API shape completely. For AI SDK responses, include all documented fields — even ones our code doesn't read today — so the test doesn't silently pass when downstream code starts reading them.

### Don't test pass-throughs

Functions that are `return await otherThing(...)` with no added logic don't earn a test. The test would re-exercise the mock and prove nothing. Examples in this repo: `fetchRecentEvents`, `fetchArticlesForEvent`, `pickArticles`, `upsertEventHeaderStep`.

### Watch each test fail

Per the TDD skill, if you write a test for existing code, mutate the production code once to confirm the test actually catches the regression. Revert, move on. We did this for the exponential backoff formula during the workflow port and caught that attempt-squared vs attempt-linear drift would've slipped past a green-only run.

### vitest globals + test-only TypeScript lint

Relax these rules for test files in `oxlint.config.ts`:

- `@typescript-eslint/consistent-type-imports` — vitest 3's typed-mock pattern (`vi.mock(import("..."))`) false-triggers this
- `vitest/prefer-*` rules — too opinionated for our style
- `promise/avoid-new`, `promise/no-multiple-resolved`, `unicorn/consistent-function-scoping` — needed for spawn / event-emitter wrapping (apply to `tests/**/*.ts` override as well as `*.test.ts`)

## Integration test rules

### Server-based only (not in-process)

**Do not** use `@workflow/vitest`'s in-process runtime. It externalizes non-step dependencies during bundling, and our TS-source workspace packages have `./lib.js` → actually `./lib.ts` imports that Node's native ESM resolver can't follow. See **SRI-255**.

Use the **server-based** approach (documented at https://workflow-sdk.dev/docs/testing/server-based): spawn a real Nitro dev server from Vitest's `globalSetup`, point tests at it via `WORKFLOW_LOCAL_BASE_URL`, use the `workflow/vite` plugin for SWC transforms only. This is what `apps/server/tests/integration-spawn.ts` implements.

### Spawn harness shape

The globalSetup must:

1. **`spawn("bun", ["nitro", "dev", "--port", PORT], {...})`** with env overrides (see below)
2. **Mirror stdout/stderr** into both capture arrays and the test runner's own streams so Nitro's logs are visible during test runs
3. **Port-probe for readiness** — `fetch("http://localhost:PORT/")` every 500ms until any response. Never scrape stdout for "Listening" — Nitro's consola logger suppresses that line under pipe stdio.
4. **Throw with actionable context** on timeout (last 1500 chars of stdout + stderr, hint about docker)
5. **SIGTERM → SIGKILL** in teardown

See `apps/server/tests/integration-spawn.ts`. Reference ticket: **SRI-258**.

### Required env overrides on the spawn

The spawned Nitro must have these set (the test-worker's `process.env` passes through, plus explicit overrides):

| Var                                                | Why                                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI: "1"`                                          | Stops Nitro from opening interactive install prompts that hang the spawn                                                                                                                            |
| `NODE_ENV: "development"`                          | Dev-mode Nitro                                                                                                                                                                                      |
| `PORT: "4000"`                                     | Fallback for the workflow runtime's queue to construct its own base URL                                                                                                                             |
| `WORKFLOW_LOCAL_BASE_URL: "http://localhost:4000"` | **Load-bearing.** Without this, the server's local-world queue can't resolve a URL to post step-transition messages to, the first step queues but never fires, and `run.returnValue` hangs forever. |

Set in `integration-spawn.ts`'s `spawn()` `env:` block, plus propagate via the vitest config's `test.env`.

### Route integration writes to docker PG, never to `DATABASE_URL`

In `vitest.integration.config.ts`:

```ts
test: {
  env: {
    LOCAL_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5433/cobalt",
    WORKFLOW_LOCAL_BASE_URL: "http://localhost:4000",
  },
}
```

`@cobalt-web/db` prefers `LOCAL_DATABASE_URL` over `DATABASE_URL`, so setting it forces tests to the docker-hosted local PG. Without this, tests would write to whatever `DATABASE_URL` is in `apps/server/.env` — often the shared dev Planetscale. Never let that happen.

### Split tests by cost

Give the cheap smoke test and the expensive canary different scripts so developers can reach for the right one:

```json
{
  "scripts": {
    "test:integration": "vitest run --config vitest.integration.config.ts --exclude '**/*.happy.integration.test.ts'",
    "test:integration:happy": "vitest run --config vitest.integration.config.ts tests/path/to/feature.happy.integration.test.ts",
    "test:integration:all": "vitest run --config vitest.integration.config.ts"
  }
}
```

- **Cheap (sad-path / infrastructure)**: no AI cost, ~10s, use to verify "pipeline works at all." Synthetic inputs that fail early.
- **Expensive (happy-path / end-to-end)**: real external calls, real AI tokens, ~30-60s. Run before shipping changes to the workflow / agent / mutations.
- **Idempotency**: run the workflow twice with the same input, then query PG directly to assert `ON CONFLICT DO UPDATE` and `DELETE + INSERT` work as replace semantics. Must be outcome-agnostic — the invariant holds whether AI succeeded or not this particular run.

### Integration tests never go in CI

The cheapest integration test still depends on docker + local PG being up, and even "cheap" ones hit real external APIs. That's noise on every push. Use them as a **manual tool** you reach for when:

- Investigating a bug you can't reproduce at the unit level
- Before shipping a release
- Touching workflow / runtime / bundler code

Document prereqs in a top-of-file comment:

```ts
/**
 * Prerequisites before running `bun run test:integration`:
 *   1. `bun run db:local:up` — local Postgres in docker
 *   2. `bun run db:migrate:local` — apply migrations
 *   3. Real `STOCK_NEWS_API_KEY` + `AI_GATEWAY_API_KEY` in apps/server/.env
 */
```

## Env seeding for unit tests in server-data

`packages/server-data` imports `@cobalt-web/env/server`, which uses t3-env to validate required vars on import. In unit tests we don't hit real external services but the env validation still runs. Seed dummies via a `test-setup.ts`:

```ts
// packages/server-data/test-setup.ts
const REQUIRED_ENV: Record<string, string> = {
  STOCK_NEWS_API_KEY: "test-stock-news",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  // ...every other required var
};
for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  process.env[key] ??= value;
}
```

And wire into `vitest.config.ts`:

```ts
setupFiles: ["./test-setup.ts"],
```

Only needed per-package that imports `@cobalt-web/env/server`. The integration test config doesn't need this — it spawns Nitro which reads from the real `apps/server/.env`.

## Cadence

| Test type                | Cadence                     | Why                                                           |
| ------------------------ | --------------------------- | ------------------------------------------------------------- |
| Unit                     | Every push (`bun run test`) | Fast, deterministic, catches regressions cheaply              |
| Integration (sad-path)   | Manual, locally             | Needs docker + local PG up; low flake but not free            |
| Integration (happy-path) | Manual, pre-release         | Real AI tokens + external flake risk; not worth putting in CI |

Unit tests are the only gate on `bun run test`. Everything else is a human decision.

## Quick reference

```bash
# Unit tests (run often)
bun run test                     # all packages
bun run test:watch               # watch mode

# Integration tests (manual, from apps/server)
cd apps/server
bun run test:integration         # sad-path only, ~10s, no AI
bun run test:integration:happy   # happy + idempotency, ~30-60s, real AI
bun run test:integration:all     # everything

# Local DB for integration
bun run db:local:up              # start docker PG
bun run db:migrate:local         # apply schema
# Wipe state if rows accumulate:
docker exec cobalt-local-db-postgres-1 psql -U postgres -d cobalt \
  -c "TRUNCATE event_articles, financial_events CASCADE;"
```

## Reference implementations

- **Pure-helper unit + DB-shape validation:** `packages/server-data/src/news/events/lib.test.ts` — `selectBestArticles`, `toEventArticleInsertRow` round-tripped through `createInsertSchema(eventArticles)`.
- **Agent unit test with mocked `ai.generateText`:** `apps/server/src/ai/agents/financial-events-summary/financial-events-summary-agent.test.ts`.
- **Step-level test with mocked `getStepMetadata`:** `apps/server/src/workflows/news/financial-events/steps.test.ts` — asserts exponential backoff on `TransientSummaryError`.
- **Workflow orchestration test with mocked mutations/agent:** `apps/server/src/workflows/news/financial-events/workflow.test.ts` — verifies step call order + `createInsertSchema(financialEvents)` shape at the workflow boundary.
- **Integration harness (spawn, port-probe, env overrides):** `apps/server/tests/integration-spawn.ts`.
- **Sad-path integration:** `apps/server/tests/workflows/news/financial-events.integration.test.ts`.
- **Happy-path + idempotency integration:** `apps/server/tests/workflows/news/financial-events.happy.integration.test.ts`.

When adding a new feature, copy the **shape** from these; only diverge when the new surface genuinely needs a different split.

## Known gotchas

- **jsdom does not bundle cleanly in Nitro.** `require.resolve("./xhr-sync-worker.js")` fails under `noExternals: true`. Use **linkedom** instead — drop-in DOM for Readability, no native workers.
- **`@workflow/vitest` in-process is broken for our monorepo shape.** See SRI-255. Use server-based.
- **Nitro dev stdout loses lines under pipe stdio.** Port-probe, don't scrape stdout.
- **Test-worker env vs spawn-child env are separate.** Anything the spawned Nitro needs must be set explicitly in the `spawn()` `env:` block, not just in `vitest.config.env` — the latter sets the test worker's `process.env`, which the spawn _inherits_ but you should overwrite critical ones (especially `WORKFLOW_LOCAL_BASE_URL`).
- **`vi.mock()` false-positives the `consistent-type-imports` lint rule.** Override for test files.
- **Row accumulation in local PG.** Integration tests don't auto-cleanup. Accept the clutter or add a `beforeEach` truncate. Never point integration tests at anything other than docker PG.
