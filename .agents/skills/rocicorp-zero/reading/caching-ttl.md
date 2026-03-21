# Query caching, activation, and TTL

Queries are not free: each one consumes **client memory**, **metadata in `zero-cache`**, and **disk** for materialized state. Zero therefore distinguishes **active** queries from **cached** queries and applies **TTLs** so idle work is reclaimed.

## Active vs cached

- **Active** — currently used by the app (for example a mounted `useQuery`, or a `preload()` you have not cleaned up).
- **Cached** — not actively used, but still **syncing** for a while in case the user returns soon.

## How queries deactivate

Deactivation depends on how the query was started:

| Mechanism           | When it deactivates                                             |
| ------------------- | --------------------------------------------------------------- |
| **`useQuery`**      | Component **unmounts** (internally `destroy()`).                |
| **`preload()`**     | You call **`cleanup()`** on the returned handle.                |
| **`zero.run()`**    | Automatically **immediately** after the result is returned.     |
| **`materialize()`** | You call **`destroy()`** on the view (see advanced note below). |

Closing the **Zero** instance (or unloading the page) deactivates **everything**.

## TTL defaults

- **`preload()`** defaults to **`ttl: 'none'`** — once deactivated, **no caching**: sync stops right away. In practice preloads are often started **once at app boot** and never torn down, so they behave like a long-lived warm dataset. The TTL clock behavior below still applies.
- **Other** queries default to **`5m`** (five minutes) of cache time after deactivation.

## TTL clock only runs while Zero runs

TTL time accrues **only while the Zero client is running** (tabs open, app alive). Time with **all tabs closed** does not count. When choosing TTLs, think in terms of **in-session** navigation patterns, not wall-clock days offline.

## Supported TTL formats

Official docs currently allow TTLs up to **`10m`**. Formats include:

| Format     | Meaning                                         |
| ---------- | ----------------------------------------------- |
| **`none`** | No cache after deactivation — stop immediately. |
| **`Ns`**   | N seconds.                                      |
| **`Nm`**   | N minutes.                                      |

Override per call site with the **`ttl`** option where the API allows it.

## Why defaults feel “short”

Short TTLs balance **responsiveness** (re-subscribing refetches fresh data) against **cost** (every live query holds resources server-side and in SQLite). If defaults feel aggressive, adjust per query — but avoid leaving large windows open for queries users rarely revisit.

## Advanced: `materialize()`

**`materialize()`** builds a **view** you can listen to for changes. It fires when the **whole result** changes, not fine-grained diffs; for per-row callbacks you implement a custom **`View`** (patterns exist in community bindings). Deactivate with **`destroy()`** on the view.

## Package reference

**`out/zql/src/query/ttl.ts`** (and siblings) — TTL defaults and options. Client activation / caching behavior: **`out/zero-client/src/client/`** next to query subscription code.

## Further reading (official)

- [Query caching](https://zero.rocicorp.dev/docs/queries#query-caching)
- [TTLs](https://zero.rocicorp.dev/docs/queries#ttls)
- [Granular updates / `materialize()`](https://zero.rocicorp.dev/docs/queries#granular-updates)
