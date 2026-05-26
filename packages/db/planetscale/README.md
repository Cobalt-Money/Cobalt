# Local Postgres setup

Local dev uses the `postgres` superuser for both DDL and runtime. The PlanetScale-specific bootstrap (`local-bootstrap.sql`) is gone — the post-squash migration history no longer references the Supabase-era `authenticated` / `service-webhook` / `auth.uid()` stubs.

## Order of operations

| Step | Command              | Purpose                                        |
| ---- | -------------------- | ---------------------------------------------- |
| 1    | `bun db:local:up`    | Start Postgres (`cobalt` DB on port 5433)      |
| 2    | `bun db:local:setup` | Apply current declared schema via drizzle push |

That's the whole flow for a fresh DB. `db:local:setup` runs `drizzle-kit push --force` against `LOCAL_DATABASE_URL`, which applies the declared schema in `packages/db/src/schema/` directly. Future schema changes follow the standard drizzle flow: `bun db:generate` to write a new migration, then `bun db:migrate` to apply it.

## Connection string (local)

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt
```

Run all commands from the **repo root** so `docker compose -f docker-compose.local-db.yml` resolves.
