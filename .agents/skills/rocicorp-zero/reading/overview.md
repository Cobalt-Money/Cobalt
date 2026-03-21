# Reading data — overview

This chapter is the **conceptual spine** for how Zero **reads and syncs** rows. The companion pages cover **APIs** ([defining-queries.md](defining-queries.md)), **server wiring** ([server-and-urls.md](server-and-urls.md)), **hooks, `run`, and preload** ([running-preloading.md](running-preloading.md)), **partial vs complete results** ([partial-results.md](partial-results.md)), **caching and TTL** ([caching-ttl.md](caching-ttl.md)), and **sort/prefix consistency** ([consistency.md](consistency.md)).

## Two copies of every query

Each named query conceptually exists in **two places**:

1. **On the client** — so the UI can evaluate ZQL against the **local store** immediately.
2. **On the server** — so `zero-cache` can ask your backend to turn **name + args (+ context)** into **authorized ZQL** to run against the **SQLite replica**.

Often the **implementation is shared** (one module imported from client and server bundles), which is natural in full-stack setups. The implementations **do not have to be identical**: the server can add **filters** the client omits so permissions stay enforced even if the browser is tampered with.

## Life of a query (timeline)

1. **Invoke** — Something in the app asks for a query (for example `useQuery(...)` or `zero.run(...)`).
2. **Client-first** — Zero runs the query function against the **local datastore** right away. Whatever rows already match are returned so the UI can paint **without waiting on the network**.
3. **Register with `zero-cache`** — The **query name** and **arguments** are sent upstream. `zero-cache` does **not** trust arbitrary SQL from the client; it calls your **`queries` HTTP endpoint** to resolve that name into **ZQL** (or an AST).
4. **Server resolution** — Your handler looks up the query, runs the **server-side** query function (with **validated args** and **`ctx`** for identity), and returns the resulting ZQL.
5. **Authoritative read** — `zero-cache` executes that ZQL on its replica and sends the **server result** to the client. The client subscription **updates** to match.
6. **Ongoing sync** — Postgres changes arrive at `zero-cache` via **logical replication**. Affected queries are updated; **row diffs** flow to clients and reactive UI updates.

So “reading” is always **optimistic local first**, then **authoritative reconciliation**, then **live updates**.

## Why named queries exist

The browser never sends ad-hoc SQL to `zero-cache`. **Names + validated args** are the contract. That gives you:

- A clear **surface area** for permissions (server narrows ZQL per user).
- Predictable **replication** (the engine knows which row sets subscriptions need).
- Type-safe **ZQL** construction in TypeScript.

## Where to go next

| Topic                                                         | File                                           |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `defineQuery`, `defineQueries`, registries, `ctx`, validators | [defining-queries.md](defining-queries.md)     |
| `ZERO_QUERY_URL`, handlers, per-client URLs, `URLPattern`     | [server-and-urls.md](server-and-urls.md)       |
| `useQuery`, `zero.run`, `zero.preload`, cleanup               | [running-preloading.md](running-preloading.md) |
| `complete` vs `unknown`, 404 flicker, query errors            | [partial-results.md](partial-results.md)       |
| Active vs cached queries, TTL defaults, deactivation          | [caching-ttl.md](caching-ttl.md)               |
| Same sort / prefix behavior, preloading multiple sorts        | [consistency.md](consistency.md)               |
| ZQL (`where`, `related`, `orderBy`, server ZQL)               | [../zql/overview.md](../zql/overview.md)       |

## Package reference

**`out/zql/src/query/`** — named query registration and ZQL returned from resolvers. **`out/zero-client/src/client/`** — `Zero` client, subscriptions, sync with `zero-cache`. **`out/zero-server/src/`** — server-side query HTTP handling.

## Further reading (official)

- [Reading and syncing data — Queries](https://zero.rocicorp.dev/docs/queries) (full reference)
