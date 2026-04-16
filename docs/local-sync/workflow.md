# Local database workflow

## Prerequisites

- Docker running
- `apps/server/.env` populated (see `packages/env` for required variables). For **local-only** dev you still need the full server env shape; point `DATABASE_URL` at local Postgres when using Docker.

## Environment variables

Add or switch these in **`apps/server/.env`** when using the local Docker database:

```bash
# Server runtime
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt

# Drizzle Kit (db:generate / db:migrate). packages/db/drizzle.config.ts reads
# LOCAL_DATABASE_URL first, then falls back to MIGRATION_URI — NOT DATABASE_URL.
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/cobalt
```

Notes:

- **Drizzle Kit never reads `DATABASE_URL`.** You must set either `LOCAL_DATABASE_URL` (preferred) or `MIGRATION_URI`, otherwise `bun db:generate` / `bun db:migrate` throws `Either LOCAL_DATABASE_URL or MIGRATION_URI must be set`.
- Using the `postgres` superuser for both is the simplest setup while migrating. If you later switch `DATABASE_URL` to `app_local:app_local_secret@…` (after `db:local:grants`) to test realistic RLS, keep `LOCAL_DATABASE_URL` pointed at the superuser so Drizzle Kit can still run DDL.
- `bun db:migrate:local` forces the Docker superuser URL on port **5433** without needing `LOCAL_DATABASE_URL` in your env.

After **`bun db:local:grants`**, you can use PlanetScale-style login users (see [`packages/db/planetscale/README.md`](../../packages/db/planetscale/README.md)):

```bash
DATABASE_URL=postgresql://app_local:app_local_secret@127.0.0.1:5433/cobalt
```

For hosted dev/staging databases, use the connection string from your provider and keep SSL/query params as required.

---

## First-time: local Docker Postgres (roles + migrations)

This repo is **migrating** from a stack that uses **native Postgres roles** (`pg_read_all_data`, `pg_write_all_data`) and **RLS**—not a hosted “Supabase client” model. Local Docker must create those roles **before** migrations that reference them in `CREATE POLICY … TO pg_read_all_data`, etc.

### 1. Start Postgres

```bash
bun db:local:up
```

Postgres **18**, database **`cobalt`**, superuser `postgres` / `postgres`, host port **5433**.

### 2. Create group roles (before migrations)

```bash
bun db:local:init
```

Runs [`packages/db/planetscale/local-bootstrap.sql`](../../packages/db/planetscale/local-bootstrap.sql).

### 3. Apply migrations

```bash
bun db:migrate
```

Uses `DATABASE_URL` / `MIGRATION_URI` from env (superuser URL is fine for CLI).

**Schema push** (quick dev only; skips migration files):

```bash
bun db:push
```

### 4. Table grants + login users (after migrations)

```bash
bun db:local:grants
```

Runs [`packages/db/planetscale/local-grants.sql`](../../packages/db/planetscale/local-grants.sql). Needed once tables exist so `GRANT … ON ALL TABLES` applies and `app_local` / `agent_local` exist.

### 5. Run the stack

```bash
bun dev
```

---

## Ongoing development (schema changes)

1. Edit Drizzle schema under `packages/db/src/schema/`.
2. Generate a migration:

   ```bash
   bun db:generate
   ```

3. Apply locally:

   ```bash
   bun db:migrate
   ```

4. If new tables need the same role grants, **`bun db:local:grants`** is safe to re-run (idempotent grants + default privileges for future tables created as `postgres`).

5. **Regenerate the Zero schema** (see [Drizzle Zero schema generation](#drizzle-zero-schema-generation) below).

6. Run `bun check` and test with `bun dev`.

---

## Drizzle Zero schema generation

Postgres is the **source of truth**. The **Zero client** and **zero-cache** replication expect a generated schema file that mirrors the Drizzle tables you expose to sync.

In this repo, **[drizzle-zero](https://www.npmjs.com/package/drizzle-zero)** reads the single barrel file **`packages/db/src/schema/zero-schema.ts`** and writes **`packages/zero/src/zero-schema.gen.ts`**.

### When to run it

Run **`bun zero:generate`** whenever you change Drizzle in a way that should be reflected in Zero (new tables/columns, renames, types clients query via ZQL):

```bash
bun zero:generate
```

This is the script in `packages/zero/package.json`:

- `drizzle-zero generate --schema ../db/src/schema/zero-schema.ts --output ./src/zero-schema.gen.ts --format --force`

Commit the updated **`zero-schema.gen.ts`** with the same change set as your Drizzle migration.

### Local order (typical)

1. `bun db:generate` → `bun db:migrate` (and `bun db:local:grants` if needed).
2. `bun zero:generate`
3. `bun check` → `bun dev` (and restart **zero-cache** if it was running—see [troubleshooting](./troubleshooting.md#zero--zero-cache)).

### Production / shared databases

For **staging or production**:

1. Merge and deploy **Drizzle migrations**; apply them on the target DB with your normal process (`bun db:migrate` against `DATABASE_URL`, hosted migration job, etc.).
2. Deploy application code that includes the new **`zero-schema.gen.ts`** and any Zero query/mutator changes.
3. **Restart or roll zero-cache** as your deployment requires so clients pick up a consistent schema version.

If you change Drizzle **without** regenerating Zero, or apply migrations **without** deploying the matching generated file, you risk **`SchemaVersionNotSupported`** or replication/client errors until Drizzle, Zero artifacts, and running processes align.

Further detail: [`packages/zero/AGENTS.md`](../../packages/zero/AGENTS.md), [Zero schema docs](https://zero.rocicorp.dev/docs/schema).

---

## Optional: copy data from a hosted database

Cobalt does not include a dedicated `prod-to-local` script. To refresh local data:

1. Use **`pg_dump`** from a client whose major version is **≥ server** (often easiest via `docker run --rm postgres:18` or matching image).
2. Restore with **`pg_restore`** or `psql` depending on format.
3. Prefer **custom format** (`pg_dump -Fc`) + `pg_restore` for tricky text/binary columns.

Always test restores against a **throwaway** local DB (`bun db:local:reset` first) so you do not corrupt something important.

---

## Reset local Postgres completely

```bash
bun db:local:reset
```

Then repeat **init → migrate → grants** (and set `DATABASE_URL` again):

```bash
bun db:local:init
bun db:migrate
bun db:local:grants
```
