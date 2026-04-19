---

## name: Cobalt — Data fetching

description: How Cobalt uses Rocicorp Zero vs TanStack Query, queryOptions factories, route loaders, prefetch, and cache reuse in apps/web. Load when adding routes, hooks, or choosing between sync and HTTP data.
version: 1.0.0
tags:

- cobalt
- data-fetching
- zero
- tanstack-query
- tanstack-router

# Data fetching (Cobalt)

This describes **patterns already used in `apps/web`**. Goal: one place to answer “Zero or React Query?”, “what goes in the loader?”, and “how do we reuse cached data?”.

## Two lanes: Zero vs TanStack Query

| Lane               | Use for                                                                                                                                      | Source of truth                                  | Typical API                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Zero**           | Rows that live in **Postgres** and are **replicated** through Zero (accounts, transactions, chats, brokerage positions, etc.)                | Postgres → drizzle-zero schema → `packages/zero` | `useQuery` from `@rocicorp/zero/react` with `queries.*` from `@cobalt-web/zero` |
| **TanStack Query** | **HTTP-only** flows: REST/Hono RPC handlers that **do not** sync through Zero (market data, screener, third-party APIs, one-off server work) | Whatever the server returns for that route       | `useQuery` from `@tanstack/react-query` with `**queryOptions`\*\* factories     |

**Rule of thumb:** If the row is in our Drizzle schema and shows up in `packages/zero` named queries, prefer **Zero**. If the feature is driven by a **dedicated API route** (e.g. `researchApi.*` in `api-client`) with no Zero query, use **TanStack Query**.

Do **not** wrap Zero subscriptions in React Query “for caching”—Zero already maintains a client store and live updates. Use RQ for HTTP caching, deduping, and `prefetchQuery` semantics.

## Router context: `queryClient` and `zero`

`apps/web/src/router.tsx` defines `RouterContext`:

- `**queryClient`\*\*: TanStack Query client (shared with `routerWithQueryClient`).
- `**zero**`: Rocicorp `Zero` instance; injected after `**ZeroProvider**` runs `init` and calls `router.update({ context: { …, zero: z } })` (`apps/web/src/lib/providers/zero-client.tsx`).

Loaders may use `**context.queryClient**` immediately. They may use `**context.zero.run(...)**` only once Zero has initialized (same as any code that depends on `zero` in context).

## Zero: hooks and loaders

### Hooks

Use `**useQuery` from `@rocicorp/zero/react**`, not React Query:

```ts
import { useQuery } from "@rocicorp/zero/react";
import { queries } from "@cobalt-web/zero";

const [rows] = useQuery(queries.transactions.list());
```

Import `**queries**` from `@cobalt-web/zero` (or domain subpaths if the package exposes them). New domain work belongs in `**packages/zero**` per `packages/zero/AGENTS.md`.

### Route loaders — preload / warm subscriptions

For routes that should **start loading Zero data before** the child tree renders, use the `**loader`** and `**context.zero.run(query)\*\*`. Example: dashboard route prefetches many queries so the first paint has data in flight:

```ts
loader: ({ context }) => {
  context.zero.run(queries.accounts.bankAccounts());
  context.zero.run(queries.transactions.list());
  // …
},
```

`run` kicks off work tied to the Zero client; components still use `**useQuery**` for the same query definitions—Zero reconciles subscription state.

## TanStack Query and `queryOptions`

`queryOptions` is a **TanStack Query v5** helper from `**@tanstack/react-query`**. It builds a **single, typed object** that bundles at least `**queryKey`** and `**queryFn**`(plus`**staleTime**`, `**retry**`, `**enabled**`, etc.). That **same object** is accepted by:

- `**useQuery(options)`** / `**useSuspenseQuery\*\*`
- `**queryClient.prefetchQuery(options)**` / `**fetchQuery**`
- `**queryClient.setQueryData(options.queryKey, data)**` (read `**.queryKey**` off the object)
- `**useQueries({ queries: [...] })**` when you need parallel HTTP queries

**Why use it in Cobalt:** one definition for **loader prefetch + component subscribe + imperative cache reads**. TypeScript infers `**queryFn` return type\*\* through the factory, so components and helpers stay aligned. Without `queryOptions`, teams often duplicate `queryKey` tuples and drift.

**Not for Zero:** `queryOptions` applies only to **React Query / HTTP** paths. Zero uses `**queries.*`** from `@cobalt-web/zero` and `**useQuery`from`@rocicorp/zero/react\*\*`—different runtime entirely.

### Factory pattern (static vs parameterized)

- **Static query:** export `**const fooQueryOptions = queryOptions({ queryKey: [...], queryFn, staleTime })`\*\* when there are no dynamic key parts (e.g. screener list).
- **Parameterized query:** export a **function** that returns `queryOptions(...)`, e.g. `**quoteQueryOptions(symbol: string)`**, so `**queryKey\*\*` includes the symbol and each ticker gets its own cache entry.

Reference implementation: `apps/web/src/components/research/research-queries.ts`.

### Cobalt conventions

1. **Colocate** `queryOptions` next to the feature (e.g. `research-queries.ts`) or in a small `*-queries.ts` module—not scattered inline in routes.
2. `**queryFn`** calls **Hono RPC** via `**researchApi`** / feature clients from `@/lib/clients/api-client`, not raw `fetch` strings, unless there is a deliberate exception.
3. **Per-query `staleTime`** when freshness differs (quotes vs fundamentals vs charts). `**gcTime**` only if you need non-default retention.
4. **Expose `queryKey` for cache helpers:** e.g. `screenerQueryOptions.queryKey` in `**getQueryData`** / `**setQueryData\*\*` so keys never diverge from the factory.

### Route loaders — `prefetchQuery`

Use `**context.queryClient.prefetchQuery(...)**` with the **exact same options** the component will pass to `**useQuery`\*\*:

```ts
loader: ({ context, params }) => {
  const sym = params.symbol.trim().toUpperCase();
  context.queryClient.prefetchQuery(quoteQueryOptions(sym));
  context.queryClient.prefetchQuery(overviewQueryOptions(sym));
  context.queryClient.prefetchQuery(chartQueryOptions(sym, "1M"));
},
```

```tsx
// Same module / same factories in the page:
const { data: quote } = useQuery(quoteQueryOptions(sym));
```

Matching `**queryKey**` + `**queryFn**` ensures the loader warms the cache `**useQuery**` reads on first render.

### Global defaults vs overrides

`getRouter()` in `apps/web/src/router.tsx` sets React Query **defaults** (`refetchOnWindowFocus: false`, `retry: 1`, `staleTime: 1 minute`). `**queryOptions`** can still set `**staleTime**` (and other fields) per query—those **override\*\* the default for that query only.

## Reusing cache across UI (React Query)

When one screen loads data and another needs a **subset** without refetching:

1. Keep a **stable `queryKey`** scheme (e.g. `["research", "screener"]`, `["ticker", symbol, "quote"]`). Prefer `**someQueryOptions.queryKey**` (from the same `queryOptions` factory) instead of copying tuple literals into helpers.
2. Read from the cache with `**queryClient.getQueryData**` in helpers (see `**screenerRowFor**` in `research-queries.ts`: bridge screener list → ticker row for placeholders).

Avoid duplicating fetch logic: **one `queryOptions` factory**, many consumers.

## Zero vs explicit row types

Generated Zero `**Row`** types may widen columns to `**unknown**`. The app sometimes uses **narrow interfaces** (e.g. in `zero-row-views.ts`) for UI boundaries, with JSDoc pointing at tables/schema. Prefer **schema-backed names\*\* from `@cobalt-web/zero/schema` when types line up; fall back to explicit types when inference is lossy.

## Related docs

- `apps/web/AGENTS.md` — router, QueryClient, Zero provider
- `packages/zero/AGENTS.md` — adding queries, `bun zero:generate`
- `.agents/skills/rocicorp-zero/SKILL.md` — Zero product behavior, ztunes alignment
- `.sandbox/ztunes` — upstream reference for Start + Zero wiring
