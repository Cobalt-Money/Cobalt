---
name: Cobalt — API Endpoints
description: How to lay out a new REST endpoint in Cobalt — folder structure, schema naming, Drizzle query patterns, ownership checks, response drift validation. Load when adding/restructuring routes in `apps/server/src/api/internal/<feature>/` + their data layer in `packages/server-data/src/<feature>/`.
version: 1.0.0
tags:
  - cobalt
  - hono
  - drizzle
  - zod
  - rest
  - openapi
---

# API Endpoints (Cobalt)

Conventions for REST endpoints (Hono `createRoute` + Drizzle + zod). Complements `mutations/` (write semantics) and `data-fetching/` (read semantics). This chapter is **layout + naming + schema shape**.

## Layout: folder-per-endpoint

Each endpoint = one route file (`apps/server/src/api/internal/<feature>/<endpoint>.ts`) + one data-layer subfolder (`packages/server-data/src/<feature>/<endpoint>/`).

```
apps/server/src/api/internal/transactions/
  list.ts          # GET /transactions
  detail.ts        # GET /transactions/{id}
  patch.ts         # PATCH /transactions/{id}
  create.ts        # POST /transactions
  activity.ts      # GET /transactions/{id}/activity
  tags.ts          # GET /transactions/{id}/tags
  index.ts         # mounts all routers

packages/server-data/src/transactions/
  list/{query,schema,index}.ts
  detail/{query,schema,index}.ts
  patch/{mutation,schema,index}.ts
  create/{mutation,schema,index}.ts
  activity/{query,schema,index}.ts
  tags/{queries,mutations,schemas,index}.ts
  _shared/{errors,lib,location,schema,index}.ts
  queries.ts       # top-level barrel (re-exports from subfolders)
  schemas.ts       # top-level barrel
  mutations.ts     # top-level barrel
```

- **One file per concern** inside a subfolder: `query.ts` for reads, `mutation.ts` for writes, `schema.ts` for zod.
- **Subfolder `index.ts`** = barrel for external import (`@cobalt-web/server-data/transactions/detail`).
- **Top-level barrels** (`queries.ts`, `schemas.ts`, `mutations.ts`) stay for backwards compat — disable `oxlint no-barrel-file` inline with comment.
- **Feature splits:** if an endpoint isn't core CRUD of a resource (e.g. `recurring`, `spending`, `geocode` aren't transactions CRUD), give it its OWN top-level feature folder under `server-data/src/`. Route file URL can still nest (`/transactions/spending`); only data layer splits.

## Naming conventions

### Schemas

| Type | Pattern | Example |
|---|---|---|
| Request — list / query string | `get<Resources>Schema` | `getTransactionsSchema`, `getSpendingSchema` |
| Request — single resource path param | `<resource>IdSchema` | `transactionIdSchema`, `tagIdSchema` |
| Request — write body | `<verb><Resource>Schema` | `createTransactionSchema`, `patchTransactionSchema` |
| Response — single resource | `<resource>ResponseSchema` | `transactionResponseSchema` |
| Response — list wrapper | `<resources>ResponseSchema` (plural) | `transactionsResponseSchema` |
| Response — non-trivial op | `<verb><resource>ResponseSchema` | `createTagResponseSchema`, `deleteTransactionResponseSchema` |
| Sub-resource entity | `<resource><Entity>Schema` | `transactionActivityEventSchema` |
| Shared primitive | bare semantic name | `currencyCodeSchema`, `isoDateSchema`, `successResponseSchema` |

### Types

Drop "Schema" + drop "Body"/"Input" suffix:
- `transactionResponseSchema` → `TransactionResponse`
- `createTransactionSchema` → `CreateTransaction`
- `patchTransactionSchema` → `PatchTransaction`

### Functions

| Type | Pattern | Example |
|---|---|---|
| Reads | `get<Resources>` (list), `get<Resource>Detail` (single), `get<X>For<Y>` (sub-resource) | `getTransactions`, `getTransactionDetail`, `getTagsForTransaction` |
| Writes | `<verb><Resource>` | `createTransaction`, `patchTransaction`, `deleteTag` |

Avoid implementation-detail names (`getTransactionById` — drop "ById", use `getTransactionDetail`).

## Schema definition — when to use what

**1. Hand-written `z.object({...})` (default for response schemas)**
- Use when wire shape must stay stable independent of DB column drift.
- Use when API field aliases storage column (`description` → `notes`) — but **prefer matching DB column names** to drop the alias.
- Use for response schemas that compose multiple tables (joined DTO).
- Each constraint explicit (`min/max/regex`). Easy to read.

**2. `createInsertSchema(table, refinements).pick(...).extend(...)` (for request bodies that map mostly 1:1 to a table)**
- Auto-derives nullability + types from DB columns.
- Refinements block holds constraints (`min/max/regex/enum`) because DB only stores types.
- `.pick({...})` keeps only user-controllable fields (exclude server-stamped: `userId`, `source`, `pending`, etc).
- `.extend({...})` adds DTO-only fields not in DB (e.g. `location` synthesized from flat cols).
- **Date columns** (`timestamp`/`date`) drizzle-zod gives `z.date()` — for wire ISO strings, override: `archivedAt: z.string().nullable()`.

**3. `createSelectSchema(table, refinements)` for row passthrough responses**
- Use when response = full row of one table with no derived fields.
- Use refinements to coerce Date → ISO string on the wire and refine enum/length constraints.
- `.omit({userId: true})` to strip server-only fields.

**Don't over-extract**: pick + extend in one chain. Avoid intermediate `xRowSlice`, `xShape`, `xRef` consts unless reused. Each layer = one more place to read.

## Drizzle query patterns

### Inline ownership in WHERE (midday style)

Default for any query taking a user-supplied id. Avoid separate `assertXOwned` helpers — adds a roundtrip without security benefit (empty result is equivalent for our threat model).

```ts
const [row] = await db
  .select({...})
  .from(transaction)
  .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
  .limit(1);
if (!row) throw new ApiError(404, "transaction_not_found", ...);
```

Keep separate assert only when verifying ownership of a **different table** that can't be inlined into the main query (e.g. `assertCategoryOwned` before a transaction patch that sets `categoryId`).

### Combine via Drizzle relational queries

Prefer one query with nested `with` over multiple roundtrips.

```ts
// Old: 2 queries (assert + fetch)
await assertTransactionOwner(userId, transactionId);
const tags = await db.query.transactionTag.findMany(...);

// New: 1 query, ownership + relation in one shot
const txn = await db.query.transaction.findFirst({
  columns: {},
  where: { id: { eq: transactionId }, userId: { eq: userId } },
  with: { transactionTags: { with: { tag: true } } },
});
if (!txn) throw new ApiError(404, ...);
return txn.transactionTags.map((jt) => toTag(jt.tag));
```

Caveat: Drizzle nested select + leftJoin returns whole-null object when ANY nested col is null. Use flat select + map when joined col can be null.

### Flat select + small mapper (when you need joined DTO)

```ts
function selectTransactionRows() {
  return db.select({ /* flat columns */ })
    .from(transaction)
    .innerJoin(...)
    .leftJoin(...);
}

function toTransactionDto(row, tagIds): TransactionResponse {
  return { /* shape DTO */ };
}

// Reused by both list + detail queries
```

Keep mapper as private fn next to the query that owns the canonical shape (detail = single, list reuses).

## Route file template

```ts
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getTransactionDetail,
  transactionResponseSchema,
} from "@cobalt-web/server-data/transactions/detail";
import { transactionIdSchema } from "@cobalt-web/server-data/transactions/_shared";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Single transaction with joined account, institution, category, and tag ids.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}",
  request: { params: transactionIdSchema },
  responses: {
    200: jsonContent(transactionResponseSchema, "Transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdSchema),
  },
  summary: "Get transaction by id",
  tags: ["Transactions"],
});

export const detailRouter = createApp().openapi(route, async (c) => {
  const { transactionId } = c.req.valid("param");
  const result = await getTransactionDetail(c.var.user.id, transactionId);
  return c.json(transactionResponseSchema.parse(result), 200);
});
```

**Required boilerplate:**
- `middleware: [requirePaidUser] as const` for auth-gated routes
- `errorResponseWithCodeSchema` for 401/403/404 (and any other 4xx)
- `validationErrorResponse(schema)` for 422 OpenAPI doc completeness
- `tags: ["Feature"]` for OpenAPI grouping
- **Parse response at `c.json`** — `responseSchema.parse(result)` catches mapper drift before sending. TS types don't validate runtime shape.

### Mutation routes return the resource

REST convention (midday-style): PATCH/POST return the affected resource, not `{success: true}`.

```ts
// PATCH /transactions/{id} → returns updated transaction
await patchTransaction(transactionId, userId, body);
const updated = await getTransactionDetail(userId, transactionId);
return c.json(transactionResponseSchema.parse(updated), 200);

// POST /transactions → returns created transaction
const { ids: [id] } = await createManualTransactions(userId, [body]);
const created = await getTransactionDetail(userId, id);
return c.json(transactionResponseSchema.parse(created), 200);
```

Saves clients a roundtrip. Use `successResponseSchema` only for endpoints with no meaningful resource (DELETE, bulk operations).

## Shared utilities — `_shared/`

Cross-endpoint primitives in `<feature>/_shared/`:

- `errors.ts` — re-export `ApiError` + feature-specific assertions (`assertCategoryOwned`)
- `lib.ts` — date / string helpers (`toDateString`, `normalizeWebsite`)
- `location.ts` — composite synthesis helpers (`locationToFlat`, `flatToLocation`)
- `schema.ts` — shared zod primitives (`transactionIdSchema`, `successResponseSchema`, `locationJsonSchema`, `transactionLockedFieldsSchema`)

Don't reach into `_shared/` of a different feature. If it's truly cross-feature, hoist to `packages/server-data/src/_shared/`.

## Migration checklist (when adding a new endpoint)

1. Pick path + method. Decide if it's CRUD of an existing resource or a derived/utility endpoint (separate feature).
2. Create data-layer folder: `server-data/src/<feature>/<endpoint>/{query|mutation,schema,index}.ts`.
3. Define schema(s) per the naming table. Inline category/location synthesis in response schemas vs creating shared sub-types.
4. Implement query/mutation. Use inline ownership in WHERE. Combine roundtrips via relational `with`.
5. Add to top-level barrels (`queries.ts`, `schemas.ts`, `mutations.ts`).
6. Add `package.json` export for the new subfolder (if exposing).
7. Create route file mirroring folder name. Declare full `responses` map. Parse response at `c.json` for drift.
8. Mount router in `index.ts`.
9. Run `bun check` — fixes formatting + flags barrel/complexity issues.

## Anti-patterns to avoid

- **`assertXOwned` before main query** when ownership can fold into WHERE — drop it.
- **Hand-built mapper files** (`to-x-list-item.ts`) — inline in query.ts.
- **`xRowSlice` + `xShape` + `xRef` + `xSchema` chains** — collapse to one named schema.
- **`Body`/`Input` suffix on types** — use `CreateX`/`PatchX`.
- **`getXById`** — describes impl. Use `getXDetail` (operation name).
- **Generic `{success: true}` response** on PATCH/POST — return the resource (midday convention).
- **Inline anonymous response schema** (`jsonContent(z.object({tagIds: ...}), ...)`) — extract + `.openapi()` register.
- **Separate `getXIds` + `getXDetails`** when caller wants tags rendered — return full DTOs in one query.
- **Description ≠ DB column name** when rename is trivial — match DB to drop the alias.
- **Reaching into sibling feature's `_shared/`** — hoist to package root if truly cross-feature.
