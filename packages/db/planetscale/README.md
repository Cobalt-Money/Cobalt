# Local Postgres bootstrap

RLS was removed; local dev uses the `postgres` superuser for both DDL and runtime. No login-user split, no grant step.

## Order of operations

| Step | Command             | Purpose                                   |
| ---- | ------------------- | ----------------------------------------- |
| 1    | `bun db:local:up`   | Start Postgres (`cobalt` DB on port 5433) |
| 2    | `bun db:local:init` | Schema/extensions bootstrap               |
| 3    | `bun db:migrate`    | Apply Drizzle migrations                  |

`local-bootstrap.sql` is idempotent.

## Files

| File                                         | When                  |
| -------------------------------------------- | --------------------- |
| [local-bootstrap.sql](./local-bootstrap.sql) | **Before** migrations |

Details: [local-bootstrap.md](./local-bootstrap.md).

## Connection string (local)

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt
```

Run all commands from the **repo root** so `docker compose -f docker-compose.local-db.yml` resolves.
