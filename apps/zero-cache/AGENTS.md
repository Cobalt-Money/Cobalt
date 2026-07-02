# apps/zero-cache

Runs Rocicorp **zero-cache**: local dev uses **`zero-cache-dev`** from `@rocicorp/zero`; production uses the **`rocicorp/zero`** Docker image (pinned in [docker-compose.yml](docker-compose.yml) to match the catalog version in the repo root `package.json`).

## Local development

1. `cp .env.example .env` and set `ZERO_UPSTREAM_DB`, `ZERO_QUERY_URL`, `ZERO_MUTATE_URL`, and (usually) the same connection string for `ZERO_CVR_DB` / `ZERO_CHANGE_DB`.
2. Start the API (`apps/server`) so query/mutate URLs resolve.
3. `bun run dev` from this folder.

## Docker (production-style)

1. Same `.env` as above, plus **`ZERO_ADMIN_PASSWORD`** (required because the compose file sets `NODE_ENV=production`). **`ZERO_REPLICA_FILE`** is set to `/data/zero.db` in [docker-compose.yml](docker-compose.yml) to match the volume mount.
2. Ensure query/mutate URLs are reachable **from inside the container** (use `host.docker.internal` instead of `localhost` if the API runs on the host).
3. `bun run compose:up` (or `docker compose up -d`).

## Web client

Set **`VITE_ZERO_CACHE_URL`** in the web app build to the public URL of zero-cache (see [apps/web/.env.example](../web/.env.example) and [zero-client.tsx](../web/src/lib/zero-client.tsx)).

## Verification

After `compose:up` (or local `bun run dev` for zero-cache-dev):

1. **Health:** `bun run verify:keepalive` — expects HTTP 200 from `GET /keepalive` on port 4848.
2. **End-to-end (production or staging):** Build the web app with **`VITE_ZERO_CACHE_URL`** pointing at the deployed zero-cache URL. Sign in, load a Zero-backed screen, confirm data syncs; run a mutator and confirm rows in Postgres.
3. **Auth:** If lists are empty while signed in, confirm `ZERO_QUERY_FORWARD_COOKIES` / `ZERO_MUTATE_FORWARD_COOKIES` and cookie domain/path for your API URL.

## Railway deployment

The prod service is `zero` in project `cobalt-zero`. Configuration lives in
[`railway.json`](railway.json) and is fronted by a `/keepalive` healthcheck
so Railway auto-restarts crashed instances (previously a crash left the
service in a "no running instance" state until a manual redeploy).

Required Railway service settings (set once in the Railway UI, not in
`railway.json` since they involve secrets or platform primitives):

1. **Volume** — mount `zero-volume` at `/data`. `ZERO_REPLICA_FILE`
   must point inside `/data` so the SQLite replica survives redeploys.
   Without a persistent volume every boot re-hydrates from PlanetScale
   and floods the WAL, which is what caused the OOM crash.
2. **Env vars** (see [`.env.example`](.env.example) for exact shape):
   - `ZERO_UPSTREAM_DB` → PlanetScale PG **direct** primary endpoint
     (port 5432, `postgres` role). Logical replication requires a real
     Postgres connection, not the PgBouncer pooler.
   - `ZERO_CVR_DB` / `ZERO_CHANGE_DB` → PlanetScale **pooler** endpoint
     (port 6432, `pscale_api_*` role).
   - `ZERO_REPLICA_FILE=/data/cobalt.db`
   - `ZERO_ADMIN_PASSWORD` — strong random secret.
   - `ZERO_LOG_LEVEL=info` in prod (drop `debug` — extra IO on the
     replica volume and noise in Railway logs).
3. **Healthcheck** — `/keepalive` on port 4848. Wired via
   `railway.json`. Do NOT rely on the default TCP probe; a hung
   zero-cache still accepts TCP but returns 5xx to `/keepalive`.
4. **Restart policy** — `ON_FAILURE` up to 10 retries, wired via
   `railway.json` so a crash loop recovers automatically instead of
   sitting idle.

### Do not wipe the replica in the start command

The previous start command ran `rm -fv /data/*.db` on every boot. Delete
that override from the Railway service's Custom Start Command if present;
`railway.json` provides the correct one (`df -h /data; exec zero-cache`).
Deleting the replica forces a full resync from PlanetScale on every
deploy — the exact burst load that OOMs single-node zero-cache.

### Backup path (future)

The `ZERO_LITESTREAM_BACKUP_URL` variable is documented in
`.env.example` but not yet set. Wiring it (S3 or R2) is a prerequisite
for splitting the service into `replication-manager` + `view-syncer`
per the Zero self-host guide.

## References

- [Deploying Zero](https://zero.rocicorp.dev/docs/deployment)
- [zero-cache configuration](https://zero.rocicorp.dev/docs/zero-cache-config)
- [Zero self-host guide](https://zero.rocicorp.dev/docs/self-host) — RM/VS split, litestream backup, disk-IOPS notes.
- After **Drizzle** schema changes, regenerate **`packages/zero/src/zero-schema.gen.ts`** with `bun zero:generate` (repo root) — see [`docs/local-sync/workflow.md`](../../docs/local-sync/workflow.md#drizzle-zero-schema-generation).
