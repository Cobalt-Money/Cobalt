# Getting started

This chapter explains **what you are building** when you adopt Zero and **how to work locally** before you dive into schema and ZQL.

## Vocabulary

| Term             | Meaning                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Upstream**     | Your real **Postgres** database—the system of record.                                                                         |
| **`zero-cache`** | A server process that holds a **SQLite replica** fed by **logical replication** from upstream.                                |
| **Local store**  | Per-client storage (commonly **IndexedDB**) where the Zero client applies optimistic reads/writes.                            |
| **Named query**  | A registered read: a **name**, **typed arguments**, and logic that becomes **ZQL** after server authorization.                |
| **Mutator**      | A registered write: runs locally first, then on the server against **Postgres**.                                              |
| **ZQL**          | Zero Query Language—TypeScript builder over the replicated schema (see [zql.md](zql.md), [zql/overview.md](zql/overview.md)). |

## What “sync” means here

Many apps use **request/response**: every screen waits on HTTP. Zero instead optimizes for **local-first**: the UI reads and writes a **local replica** that **converges** with Postgres through **subscriptions** to named queries.

That does **not** mean “offline forever without care.” It means latency is hidden behind local state, while **`zero-cache`** and your **query/mutate servers** keep everyone consistent with upstream.

## When Zero is a good fit

Zero tends to work well when:

- **Postgres** is (or can be) your primary transactional store.
- You can run **`zero-cache`** with a reliable network path to Postgres that supports **logical replication**.
- You are willing to model reads as **named, server-authorized queries** rather than exposing raw SQL from the browser.

Zero is a weaker fit when you cannot meet replication requirements, cannot run `zero-cache`, or your product is better served by a simple CRUD API with no local replica.

## What you install and run

A minimal development setup usually includes:

1. **Postgres** configured for **logical replication** (version and flags depend on host—see [postgres-support.md](postgres-support.md) and [providers.md](providers.md)).
2. **`zero-cache`**, pointed at upstream Postgres and at your **app server** URLs for **query resolution** and **mutations** (see [deployment.md](deployment.md)).
3. Your **web app** with the **Zero client** and your **API server** implementing those two HTTP surfaces.

Starter repositories exist for common stacks (Vite + Hono + React, Cloudflare Workers, Solid). Use one that matches your deployment target so you copy **process layout** and **env wiring**, not just dependencies.

## Local workflow (recommended)

1. **Migrate** upstream schema with normal Postgres migrations. Zero’s behavior is easiest to reason about when dev data matches what replication publishes.
2. **Regenerate** any generated Zero schema artifacts after you change tables or columns (in this repo, follow [`packages/zero/AGENTS.md`](../../../packages/zero/AGENTS.md)). Drift between client schema and replication causes hard-to-debug version errors.
3. Start **`zero-cache`** and your **API** with correct **query** and **mutate** URLs.
4. If you **drop** or **recreate** the dev database, plan to **wipe `zero-cache`’s SQLite replica** and **restart `zero-cache`**—otherwise the cache believes an old world still exists (see [debugging.md](debugging.md) and [faq.md](faq.md)).

## How this skill continues

Next: [schema.md](schema.md) (shape of data), then [postgres-support.md](postgres-support.md) (database requirements), then [reading.md](reading.md) (start with [reading/overview.md](reading/overview.md)) and [writing.md](writing.md) (start with [writing/overview.md](writing/overview.md)).

## Package reference

Locate **`@rocicorp/zero`** under `node_modules` (Bun often nests under `.bun/@rocicorp+zero@<version+hash>/node_modules/@rocicorp/zero`). Read **`out/**/\*.d.ts`**. Major areas: **`out/zero-client/`** (client + sync), **`out/zql/`** (queries + mutator builder), **`out/zero-server/`** (HTTP + Postgres ZQL), **`out/zero-react/`**, **`out/zero-schema/`**, **`out/zero-protocol/`**, **`out/zero-cache/`\*\*. Each chapter below names the slice that matches that topic.

For **end-to-end patterns** in this repo (separate from `apps/web` + `packages/zero`), see the **ztunes** sample under [`.sandbox/ztunes`](../../../.sandbox/ztunes).

## Further reading (official)

- [Installation](https://zero.rocicorp.dev/docs/install)
- [Quickstart](https://zero.rocicorp.dev/docs/quickstart)
- [Samples](https://zero.rocicorp.dev/docs/samples)
- [What is Sync?](https://zero.rocicorp.dev/docs/sync)
- [When to Use](https://zero.rocicorp.dev/docs/when-to-use)
