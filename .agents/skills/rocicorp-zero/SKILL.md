---
name: rocicorp-zero
description: Guides Rocicorp Zero sync (schema, ZQL, queries, mutators, zero-cache, Postgres providers, deployment, debugging, React). Use when working with Zero, real-time sync, ZQL, zero-cache, mutators, query sync, connection issues, Supabase/PlanetScale Postgres, or troubleshooting Zero.
---

# Rocicorp Zero

This folder is written as **in-repo documentation**: concepts are explained here first. Use sibling `.md` files like chapters of a small docs site. Official Rocicorp pages are listed at the bottom of many files under **Further reading** when you need to confirm marketing-level API churn.

**When you need technical precision** (exact types, handler shapes, option names): open the installed **`@rocicorp/zero`** package on disk. With Bun it is often under `node_modules/.bun/@rocicorp+zero@<version+hash>/node_modules/@rocicorp/zero`; use `find node_modules -path '*/@rocicorp/zero/package.json'` from the repo root if needed. Implementation types and re-exports live under **`out/`** in subpackages such as **`zero-client`**, **`zql`**, **`zero-server`**, **`zero-react`**, **`zero-schema`**, **`zero-protocol`**, **`zero-cache`**. Each chapter below ends with a **Package reference** naming the relevant **`out/<subpackage>/src/...`** area—read the **`.d.ts`** files (and paths they re-export) there.

## What Zero is

Zero is a **query-driven sync** system for TypeScript apps whose **system of record is Postgres**.

- **Postgres** stores the truth. **Logical replication** streams changes to **`zero-cache`**, a process that keeps a **SQLite replica** of the replicated subset of your database.
- **Clients** keep a **local store** (often IndexedDB). Reads and writes hit that store first so the UI feels instant.
- Clients **do not** ship arbitrary SQL to `zero-cache`. You define **named queries** and **mutators** in application code. The sync layer knows how to fetch and merge **only what those definitions require**.

## End-to-end data flow (reads)

1. The UI subscribes to a **named query** with arguments (for example “messages for thread X”).
2. The **Zero client** evaluates **ZQL** against the **local store** immediately so the screen can render.
3. **`zero-cache`** receives the subscription. It calls **your application server** at the configured **query URL** (often exposed as `ZERO_QUERY_URL` in `zero-cache` config). Your server receives the **query name**, **arguments**, and **authenticated context**.
4. Your server returns **authorized ZQL** (or equivalent) that describes exactly which rows this user may see—narrowing by user id, tenant, role, and so on.
5. `zero-cache` runs that ZQL against its **SQLite replica**, then streams **authoritative** results back to the client, which reconciles local state.

So: **permission enforcement belongs on the server** at query-resolution time. The client is untrusted for row-level security.

## End-to-end data flow (writes)

1. The UI invokes a **mutator** (a named write handler with arguments).
2. The mutator runs **optimistically** against the **local store** so buttons and lists update immediately.
3. `zero-cache` forwards the mutation to **your application server** at the **mutate URL** (`ZERO_MUTATE_URL`). That handler runs the change **directly against Postgres**.
4. Postgres changes replicate into `zero-cache`; subscribed queries update clients.

Mutators can run **more than once** (retries, client replay, server execution). Design them so repeated execution is safe. **Do not** mint primary keys inside mutators in a way that differs between runs—generate stable IDs on the client and pass them in.

## Reading order (this skill)

1. [getting-started.md](getting-started.md) — product fit, local workflow, vocabulary
2. [schema.md](schema.md) — tables, relationships, migrations, publications
3. [postgres-support.md](postgres-support.md) — what Postgres must support
4. [reading.md](reading.md) — queries, preload, partial results, TTL (see **reading/** subfolder)
5. [authentication.md](authentication.md) — identity and row-level access on the server
6. [writing.md](writing.md) — mutators, push endpoint, `tx` (see **writing/** subfolder)
7. [zql.md](zql.md) — ZQL builder, filters, relationships, server ZQL (see **zql/** subfolder)
8. [react.md](react.md) — React provider and hooks (this monorepo)
9. [deployment.md](deployment.md) — processes, env vars, topology
10. [providers.md](providers.md) — Supabase, PlanetScale for Postgres, pitfalls
11. [connection.md](connection.md) — sync connection lifecycle and reconnect
12. [rest.md](rest.md) — HTTP APIs next to sync (optional)
13. [debugging.md](debugging.md) — inspector, plans, replication
14. [faq.md](faq.md) — symptoms, pitfalls, quick answers

## Cobalt monorepo

- Package: [`packages/zero`](../../../packages/zero) — schema, queries, mutators, exports. Conventions: [`packages/zero/AGENTS.md`](../../../packages/zero/AGENTS.md).
- App wiring: Zero client is typically initialized in the web app; query/mutate endpoints live on the API server—confirm paths in your branch.
- Sample app: [`.sandbox/ztunes`](../../../.sandbox/ztunes) — standalone Zero reference for patterns (schema, queries, mutators, `zero-cache` wiring); not part of the Turborepo `bun build` graph unless you wire it yourself.

## Further reading

- Project home and doc hub: [zero.rocicorp.dev](https://zero.rocicorp.dev/)
- Machine-oriented index of topics: [llms.txt](https://zero.rocicorp.dev/llms.txt)
