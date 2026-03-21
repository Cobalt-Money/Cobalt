# Reading data (queries and sync)

Zero **reads** through **named queries**: registered functions that return **ZQL**, evaluated **locally first** then reconciled with **`zero-cache`** and Postgres-backed replication. This topic is split into a **reading/** folder so each concept stays easy to scan.

## Start here

1. **[reading/overview.md](reading/overview.md)** — life of a query, client + server copies, end-to-end timeline
2. **[reading/defining-queries.md](reading/defining-queries.md)** — `defineQuery`, `defineQueries`, names, args, validators, `ctx`
3. **[reading/server-and-urls.md](reading/server-and-urls.md)** — query HTTP endpoint, `ZERO_QUERY_URL`, `URLPattern`, previews
4. **[reading/running-preloading.md](reading/running-preloading.md)** — `useQuery`, `zero.run`, **`zero.preload()`**, cleanup, local-only ZQL
5. **[reading/partial-results.md](reading/partial-results.md)** — `complete` vs `unknown`, 404 flicker, errors
6. **[reading/caching-ttl.md](reading/caching-ttl.md)** — active vs cached, deactivation, TTL defaults (`preload` vs others)
7. **[reading/consistency.md](reading/consistency.md)** — prefix behavior, multiple sorts, preload strategy

## One-page summary

- **No ad-hoc SQL from the browser** — only **registered names + validated args** hit the wire; the server returns **authorized ZQL**.
- **Subscriptions** (`useQuery`, etc.) keep queries **active** while mounted; **`zero.preload()`** warms large slices without fully materializing them like a screen query.
- **`zero.run()`** is for **one-shot** reads; use **`{ type: 'complete' }`** when you must wait for the server.
- **Partial vs complete** — use **`result.type === 'complete'`** before showing definitive empty / 404 UI.
- **Mutators** see only rows already loaded by **active** queries or preloads — see [writing/defining-mutators.md](writing/defining-mutators.md).

## Performance and ops

Heavy ZQL still needs good **Postgres indexes**; use **`analyze-query`** and [debugging.md](debugging.md) when plans regress.

## Package reference

Each page under **`reading/`** ends with a **Package reference**. Broadly: **`out/zql/src/query/`** (named queries, ZQL), **`out/zero-client/src/client/`** (`Zero`, preload, `run`), **`out/zero-server/src/`** (query HTTP / handlers).

## Further reading (official)

- [Reading and syncing data](https://zero.rocicorp.dev/docs/queries)
- In-repo ZQL guide: [zql.md](zql.md) and [zql/overview.md](zql/overview.md)
- [Slow queries](https://zero.rocicorp.dev/docs/debug/slow-queries)
