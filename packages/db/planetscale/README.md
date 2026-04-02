# Postgres roles (PlanetScale-aligned local dev)

Cobalt is migrating from a stack where **Postgres roles** (`pg_read_all_data`, `pg_write_all_data`) and **RLS policies** are part of the schema. This is **not** “Supabase client” magic—it is **native PostgreSQL** roles and policies, matching how hosted PlanetScale Postgres is structured.

Local Docker must mirror that **before** migrations that reference those roles in `CREATE POLICY … TO pg_read_all_data` (etc.).

## Order of operations

| Step | Command               | Purpose                                                        |
| ---- | --------------------- | -------------------------------------------------------------- |
| 1    | `bun db:local:up`     | Start Postgres (`cobalt` DB on port 5433)                      |
| 2    | `bun db:local:init`   | Create NOLOGIN group roles + schema usage                      |
| 3    | `bun db:migrate`      | Apply Drizzle migrations (RLS, tables, …)                      |
| 4    | `bun db:local:grants` | Table/sequence grants + login users `agent_local`, `app_local` |

`local-bootstrap.sql` and `local-grants.sql` are **idempotent** where it matters (`IF NOT EXISTS` for roles).

## Files

| File                                         | When                  |
| -------------------------------------------- | --------------------- |
| [local-bootstrap.sql](./local-bootstrap.sql) | **Before** migrations |
| [local-grants.sql](./local-grants.sql)       | **After** migrations  |

Details: [local-bootstrap.md](./local-bootstrap.md), [local-grants.md](./local-grants.md).

## Connection strings (local only)

After `db:local:grants`, you can point services at login users (passwords are **dev-only**):

```bash
# App (read/write; RLS as app user)
DATABASE_URL=postgresql://app_local:app_local_secret@127.0.0.1:5433/cobalt

# Optional: agent / read path (RLS as read role)
# AGENT_DATABASE_URL=postgresql://agent_local:agent_local_secret@127.0.0.1:5433/cobalt
```

Until the app is wired to use `app_local`, you may still use `postgres:postgres` for simplicity; switch when you align env with production-style roles.

Run all commands from the **repo root** so `docker compose -f docker-compose.local-db.yml` resolves.
