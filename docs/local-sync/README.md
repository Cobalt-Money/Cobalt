# Local database development

How to run **PostgreSQL locally** (Docker), keep **Drizzle** migrations aligned with **Rocicorp Zero** (via **drizzle-zero**), and share config across **Git worktrees**.

## Overview

| Layer                              | Location                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Schema (Postgres)**              | Drizzle — `packages/db/src/schema/`, migrations under `packages/db/src/migrations/`, config `packages/db/drizzle.config.ts` |
| **Zero client schema (generated)** | `drizzle-zero` → `packages/zero/src/zero-schema.gen.ts` (see [workflow](./workflow.md#drizzle-zero-schema-generation))      |
| **Env**                            | Zod-validated in `packages/env` — server vars from `apps/server/.env` (`packages/env/src/server.ts`)                        |
| **Local DB**                       | Docker Compose `docker-compose.local-db.yml` — Postgres 18 on host port **5433**                                            |
| **Postgres roles**                 | PlanetScale-style group roles + RLS — [`packages/db/planetscale/README.md`](../../packages/db/planetscale/README.md)        |

## Quick start

1. [Workflow](./workflow.md) — first-time setup (init → migrate → grants), **Drizzle + Zero regeneration**, optional prod migration order
2. [Troubleshooting](./troubleshooting.md) — Docker, connections, migrations, **Zero / zero-cache**

## Scripts (repo root)

| Command                | Purpose                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `bun db:local:up`      | Start local Postgres (Docker)                                             |
| `bun db:local:down`    | Stop local Postgres (keeps data volume)                                   |
| `bun db:local:reset`   | Stop, **delete volume**, start fresh empty DB                             |
| `bun db:local:init`    | Create `pg_read_all_data` / `pg_write_all_data` (**before** migrate)      |
| `bun db:local:grants`  | Table grants + `app_local` / `agent_local` (**after** migrate)            |
| `bun db:migrate`       | Apply migrations (see `packages/db/drizzle.config.ts` URL order)          |
| `bun db:migrate:local` | Same as migrate, forces Docker superuser URL on port **5433**             |
| `bun db:push`          | Push schema (dev; bypasses migration files)                               |
| `bun db:generate`      | Generate a new migration from schema changes                              |
| `bun db:studio`        | Open Drizzle Studio                                                       |
| `bun sync-env`         | Copy `.env*` from the **main** Git worktree into the **current** worktree |
| `bun sync-sandbox`     | Copy `.sandbox/` from the main worktree (gitignored samples; optional)    |

### Git worktrees

- **Env files:** `bun sync-env` — secondary worktrees do not get `.env` files automatically.
- **Sandbox folder:** `bun sync-sandbox` — keeps `.sandbox/` (e.g. reference apps like `ztunes`) in sync when you use linked worktrees. Safe no-op if you are already in the main worktree or main has no `.sandbox`.

### Git worktrees and one shared local DB

Compose’s default **project name** is the **directory name** of the repo, which would create **different volumes** and confusing names. This repo sets `name: cobalt-local-db` in `docker-compose.local-db.yml` so the **same** Docker volume and **5433** binding apply from **any** worktree.

To use that single Postgres from every checkout:

1. Start (or keep) one container: `bun db:local:up` from **any** worktree — project `cobalt-local-db`.
2. Use the **same** local URL in each worktree’s `apps/server/.env` (see [workflow](./workflow.md)).
3. Do **not** run a second Postgres on **5433** from another machine path unless you stop the first (`bun db:local:down`).

## Conventions

1. **Docker** — required for `bun db:local:*` (Docker Desktop or compatible engine).
2. **Roles + RLS** — not Supabase SDK auth; **Postgres** roles and policies. Run **`db:local:init` → `db:migrate` → `db:local:grants`** when working against the migrated schema (see [`packages/db/planetscale/`](../../packages/db/planetscale/README.md)).
3. **Optional `MIGRATION_URI`** — if set, Drizzle Kit uses it instead of `DATABASE_URL` for CLI (`drizzle.config.ts`).
4. **Drizzle and Zero** — after **any** Drizzle schema change that should appear in Zero, run **`bun zero:generate`** from the repo root (see [workflow](./workflow.md#drizzle-zero-schema-generation)). Skipping this causes client/replication drift (e.g. `SchemaVersionNotSupported` in zero-cache).

## Related reference

- **Zero package:** [`packages/zero/AGENTS.md`](../../packages/zero/AGENTS.md) — queries, mutators, `bun zero:generate`.
- **zero-cache:** [`apps/zero-cache/AGENTS.md`](../../apps/zero-cache/AGENTS.md) — local and Docker.
- **drizzle-zero:** generates `zero-schema.gen.ts` from `packages/db/src/schema/drizzle-schema.ts`; upstream docs in the [`drizzle-zero`](https://www.npmjs.com/package/drizzle-zero) package README.
- Workflow structure borrows from `.sandbox/horizon-test/docs/local-sync/`. Cobalt does not ship a one-command “prod → local” data sync; use `pg_dump` / `pg_restore` or your host’s tooling ([workflow](./workflow.md#optional-copy-data-from-a-hosted-database)).
