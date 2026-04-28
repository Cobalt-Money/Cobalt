# Local database troubleshooting

## Docker

### Cannot connect to the Docker daemon

**Cause:** Docker is not running.

**Fix:** Start Docker Desktop (or your engine), wait until it is ready, then:

```bash
bun db:local:up
```

### Port 5433 already in use

**Cause:** Another process is bound to `5433`.

**Fix:** Stop the other service, or change the host port in `docker-compose.local-db.yml` (e.g. `5434:5432`) and update `DATABASE_URL` accordingly.

### Container / volume in a bad state

**Fix:**

```bash
bun db:local:reset
bun db:local:init
bun db:migrate
```

---

## Connection refused to `127.0.0.1:5433`

**Cause:** Local Postgres is not running.

**Fix:**

```bash
bun db:local:up
psql "postgresql://postgres:postgres@127.0.0.1:5433/cobalt" -c "SELECT 1"
```

---

## Migrations

### "Relation does not exist" / empty database

**Cause:** Migrations were not applied.

**Fix:**

```bash
bun db:migrate
```

If you intended a fresh volume, run `bun db:local:reset` first, then **init → migrate → grants** again.

### `pg_dump` / server version mismatch

**Cause:** Client `pg_dump` is older than the remote Postgres major version.

**Fix:** Run `pg_dump` from a Docker image that matches or exceeds the server (e.g. `postgres:18` for Postgres 18).

---

## Env validation errors on startup

**Cause:** `@cobalt-web/env/server` expects all required server variables; a partial `.env` fails fast.

**Fix:** Keep `apps/server/.env` complete for the server. For local DB you typically only change `DATABASE_URL` / `MIGRATION_URI`, not remove other keys.

---

## Worktree missing `.env`

**Cause:** Secondary Git worktrees do not copy env files automatically.

**Fix:**

```bash
bun sync-env
```

---

## Worktree missing `.sandbox/`

**Cause:** `.sandbox` is gitignored; linked worktrees do not get reference apps from the main checkout.

**Fix:**

```bash
bun sync-sandbox
```

---

## Zero / zero-cache

### `SchemaVersionNotSupported` or client expects columns replication does not have

**Cause:** **`packages/zero/src/zero-schema.gen.ts`** is out of date vs Drizzle/Postgres, or migrations were applied without deploying the regenerated Zero schema.

**Fix:**

1. Ensure migrations are applied on the **same** database zero-cache replicates from.
2. Regenerate and deploy:

   ```bash
   bun zero:generate
   ```

3. Restart **zero-cache** (and redeploy the web app if it bundles an old schema). See [`packages/zero/AGENTS.md`](../../packages/zero/AGENTS.md).

### Stale SQLite replica after `bun db:local:reset`

**Cause:** Zero’s docs: resetting upstream Postgres without clearing **zero-cache**’s local replica leaves a mismatched world.

**Fix:** Delete zero-cache’s replica file (or volume) and **restart** `zero-cache`, per [`apps/zero-cache/AGENTS.md`](../../apps/zero-cache/AGENTS.md) and [Rocicorp debugging](https://zero.rocicorp.dev/docs/debugging).

---

## Two Postgres containers or “wrong” data after changing the Compose project name

**Cause:** Docker used to name the project after the folder (`san-jose_…`). The file now pins `name: cobalt-local-db`, which is a **different** Compose project (new volume) until you remove the old stack.

**Fix:** Stop and remove the old project, then start again:

```bash
# From the repo where the old stack was created (or use docker ps to find names)
docker compose -p san-jose -f docker-compose.local-db.yml down

bun db:local:up
```

If port **5433** is still in use, stop the container using it (`docker ps`), then `bun db:local:up` again.

---

## More help

- Local DB + Drizzle + Zero: [`docs/local-sync/README.md`](./README.md)
- Drizzle: `.agents/skills/drizzle-orm/SKILL.md`
- Postgres: `.agents/skills/postgres/SKILL.md`
- Package DB layout: `packages/db/AGENTS.md`
- Zero: `.agents/skills/rocicorp-zero/SKILL.md`, `packages/zero/AGENTS.md`
