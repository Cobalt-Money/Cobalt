# Server Evals

Real-model evals for the CSV onboarding AI agents. Built on [evalite](https://www.evalite.dev/) (Vitest-based). Local-first; results in `node_modules/.evalite`, UI at `localhost:3006`.

## Scope

Three agents under `apps/server/src/ai/agents/`:

- `csv-column-mapping` — headers + sample rows → CSV column mapping
- `csv-account-mapping` — source labels + user accounts → link/create/skip decisions
- `csv-category-mapping` — source labels + user categories → link/linkRename/create/skip decisions

Each agent has one `*.eval.ts` file calling the real agent through `AI_GATEWAY_API_KEY`. Mock-based unit tests live alongside agents as `*.test.ts` (Layer 1) — see SRI-333.

## Run

```bash
# from repo root
bun --filter server eval         # watch + UI on :3006
bun --filter server eval:run     # one-shot
bun --filter server eval:ci      # one-shot, fail < 70% avg score
```

Requires `AI_GATEWAY_API_KEY` in `apps/server/.env`. By default evals skip when the key is missing or `CI=true`. Force-run with `RUN_EVALS=1`.

## Layout

Evals are colocated with the agent they exercise, matching the `*.test.ts` pattern:

```
apps/server/src/ai/agents/
├── EVALS.md                                     # this file
├── _shared/
│   ├── eval-gate.ts                             # RUN_EVALS / CI gating
│   └── eval-scorers.ts                          # structural + LLM-judge scorers
├── csv-column-mapping/
│   ├── csv-column-mapping-agent.ts
│   ├── csv-column-mapping-agent.test.ts         # mock unit tests
│   ├── csv-column-mapping-agent.eval.ts         # real-model eval
│   └── csv-column-mapping-agent.fixtures.json
├── csv-account-mapping/...
└── csv-category-mapping/...
```

## Fixture format

All fixtures are JSON arrays. Each entry has a `name`, agent-specific inputs, and an `expected` object the scorer reads. PII must be synthetic — no real account numbers, names, or balances.

**Column** — `{ name, headers[], rows[], expected: { amountKind?, dateKind?, accountNull?, parensNegative?, dateFormat? } }`

**Account** — `{ name, sourceLabels[], userAccounts[], expected: { byLabel: { [label]: { action, accountId?, suggestedType?, suggestedSubtype? } } } }`

**Category** — `{ name, sourceLabels[], userCategories[], expected: { byLabel: { [label]: { action, targetCategoryId?, newNameContains? } } } }`

## Scorers

Defined in `_shared/eval-scorers.ts`:

- `columnShapeScorer` — fraction of declared expectations (amountKind/dateKind/...) that match
- `columnStructuralValidity` — required slots (merchant/amount/date) populated
- `accountDecisionScorer` — per-label action + accountId/type/subtype agreement
- `categoryDecisionScorer` — per-label action + target + fuzzy name match
- `categoryCreateHasNewCategory` — every `action=create` carries `newCategory.name + iconKey` (SRI-321 regression)
- `iconKeyReasonable` — LLM-as-judge (Haiku) on iconKey/category-name fit

## Adding a fixture

1. Append to the matching `*.fixtures.json` next to the agent. Mirror an existing entry.
2. Strip real account numbers / customer names — synthetic only.
3. Set the narrowest `expected` block that locks the regression you care about; leave the rest open so the scorer doesn't punish acceptable variation.
4. Run `bun --filter server eval` and confirm the new row scores cleanly.

## Baselines

No baseline files yet. After the first run land per-agent threshold in `eval:ci` (e.g. `--threshold=80`) or wire a JSON baseline via `evalite --outputPath=./baseline.json` and diff in CI. Tracked in SRI-333 follow-up.

## CI

Mock unit tests (`*.test.ts`) run on every PR via `bun test`. Real-model evals are nightly only (follow-up workflow); cost-gated by `RUN_EVALS=1 + AI_GATEWAY_API_KEY`.
