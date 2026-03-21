# Postgres requirements

Zero is built on **Postgres** with **logical replication**. This chapter states **what the database must support** regardless of host. Provider-specific quirks (connection strings, IPv6, roles) live in [providers.md](providers.md).

## Version

Run **Postgres 15 or newer**. Older versions are outside Zero’s support assumptions.

## Logical replication

**Logical replication** streams **row changes** (insert/update/delete) to subscribers. `zero-cache` consumes that stream to maintain **SQLite**.

Practical requirements:

- Replication must be **allowed** for the tables you publish.
- A **replication slot** is created for `zero-cache` so it does not miss changes while offline (hosts may cap slots—watch limits).

## `wal_level`

On Postgres you control yourself, **`wal_level`** must be **`logical`** so the write-ahead log carries enough information for logical decoding.

Hosted databases often expose this as a **parameter group**, **flag**, or support ticket—not always raw `ALTER SYSTEM`. Follow the host’s “logical replication” documentation.

## Event triggers (schema migrations)

Zero can use Postgres **event triggers** to hook **schema migration** events for tighter integration.

- **With event triggers:** smoother migration story.
- **Without:** Zero may still run, but schema changes can force **full resets** of cache and clients. For **large** databases, lack of event triggers is a serious operational cost.

Pick hosts that grant event triggers when you expect frequent schema evolution.

## Indexing and query health

Replication carries **rows**, not arbitrary server computation. If your ZQL patterns need sequential scans on huge tables, both **Postgres** and **`zero-cache`** SQLite work harder.

**Rule of thumb:** Index foreign keys and columns that appear in **every** common filter (`org_id`, `user_id`, `created_at` ranges).

## WAL retention and dev-only tuning

Some teams bound **`max_slot_wal_keep_size`** in **development** so disk does not fill if `zero-cache` stops. That can **invalidate replication slots**; `zero-cache` may **resync from scratch** when it comes back. Treat that as a **dev convenience**, not a production default.

## Related chapters

- [providers.md](providers.md) — Supabase, PlanetScale for Postgres, Neon notes
- [deployment.md](deployment.md) — wiring `zero-cache` to upstream
- [faq.md](faq.md) — “replication failed” symptoms

## Package reference

Mostly **operational** (Postgres + `zero-cache`). For replication / cache internals start in **`out/zero-cache/src/`**. Client/server ZQL against Postgres: **`out/zero-server/src/`** (adapters, `ZQLDatabase` — see [zql/server-zql.md](zql/server-zql.md)).

## Further reading (official)

- [Connecting to Postgres](https://zero.rocicorp.dev/docs/connecting-to-postgres)
- [Postgres feature compatibility](https://zero.rocicorp.dev/docs/postgres-support)
