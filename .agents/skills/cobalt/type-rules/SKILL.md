---
name: Cobalt — Type rules
description: When to annotate function return types vs let TS infer, and when to derive types from zod schemas vs hand-declare interfaces. Load when writing or reviewing TS in this monorepo so signatures stay consistent across packages.
version: 1.0.0
tags:
  - cobalt
  - typescript
  - zod
  - conventions
---

# Type rules (Cobalt)

How to type function signatures and shared shapes in this codebase. Complements `@typescript-eslint` defaults — these are the project-specific calls.

## Return type annotations

| Function kind                                       | Annotate return? | Why                                                                                                                                |
| --------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Exported** function                               | **Yes**          | Locks the public contract. Internal refactor breaks at the definition site (clear), not at every call site (hunt).                  |
| **Internal helper** returning a **primitive / DTO** | **Yes**          | Cheap to spell out, communicates intent (`Promise<void>` says "no return on purpose"). Matches existing helpers (see references below). |
| **Internal helper** returning a **Drizzle row**     | **No** (infer)   | Annotating duplicates the schema-derived shape — brittle. Inference flows full intellisense to the caller and updates when schema changes. |
| **Generic** (`<T>` in signature)                    | **Yes**          | TS can't infer the return parameter — must be declared. Example: `withFmpUpstream<T>(fn): Promise<T>`.                              |

**Don't invent interfaces just to annotate.** Inline object types are fine for one-off returns. Only extract an `interface` / `type` when it's reused in ≥2 places or exported from `schemas.ts`.

### Reference examples in the repo

**Annotated exports**:
- `packages/server-data/src/research/fmp-ticker.ts:71` — `fmpGetQuote(symbol: string): Promise<FmpQuote>`
- `packages/server-data/src/institutions/mutations.ts:30` — `upsertInstitutionByPlaidId(...): Promise<void>`
- `packages/server-data/src/research/fmp-errors.ts:8` — `withFmpUpstream<T>(fn): Promise<T>`

**Annotated internal helpers** (primitive / void / hand-built):
- `packages/server-data/src/snapshots/mutations.ts:7` — `todayIso(): string`
- `packages/server-data/src/snapshots/mutations.ts:12` — `signFlip(value: string): string`
- `packages/server-data/src/research/fmp-screener.ts:39` — `coerceNumber(v: unknown): number | null`
- `packages/server-data/src/research/fundamentals-refresh.ts:70` — `mapIncomeFields(...): Partial<FundamentalsInsert>`

**Inferred** (Drizzle row return):
- `packages/server-data/src/institutions/queries.ts:4` — `getInstitutionByPlaidId(...)`
- `packages/server-data/src/brokerage/queries.ts:92` — `getBalancesByUserId(userId)`

## Derive types from zod schemas — don't re-declare

If a function's input shape is already encoded in a zod schema (REST body, query params, Zero mutator schema), import the inferred type instead of hand-writing an `interface`.

```ts
// packages/server-data/src/brokerage/manual-holdings/schemas.ts
export const createManualHoldingBodySchema = z.object({ ... });
export type CreateManualHoldingBody = z.infer<typeof createManualHoldingBodySchema>;

// packages/server-data/src/brokerage/manual-holdings/mutations.ts
import type { CreateManualHoldingBody } from "./schemas.js";
export async function createManualHolding(
  userId: string,
  input: CreateManualHoldingBody,
): Promise<{ holdingId: string }> { ... }
```

The schema is the single source of truth: validation, OpenAPI docs, and TS types all derive from one definition. A hand-written `interface CreateManualHoldingInput` would drift the moment the schema changes.

**When to keep hand-written types:**
- Pure transforms with no schema (utility helpers, DB row shapes)
- Internal-only structs used in one file

**When to derive (`z.infer`):**
- Anything that flows through a REST body / query
- Anything that flows through a Zero mutator schema
- Anything exposed in `schemas.ts` (already exported across the package — see existing pattern in `packages/server-data/src/research/schemas.ts`, `brokerage/schemas.ts`, `transactions/schemas.ts`)

## Don't annotate inferable locals

Inside function bodies, skip annotations TS can derive:

```ts
// Bad — annotation duplicates inference
const ticker: string = args.ticker.trim().toUpperCase();

// Good — TS infers `string`
const ticker = args.ticker.trim().toUpperCase();
```

Exception: when you want to **narrow** to a stricter type than TS would pick (e.g. `as const`, branded types).

## Generics — only when needed

Use `<T>` only when the function is genuinely polymorphic over input/output types. Common in utility wrappers (`withFmpUpstream`, retry helpers), rare in business logic. If a function only handles one concrete type, generics add noise without benefit.

## Quick checklist before merging

- [ ] Exported function returns are annotated.
- [ ] No hand-written interface duplicates a zod schema — use `z.infer`.
- [ ] Internal helpers returning Drizzle rows use inference.
- [ ] Internal helpers returning primitive / void / hand-built DTOs are annotated.
- [ ] No annotation on locals that TS can infer.
