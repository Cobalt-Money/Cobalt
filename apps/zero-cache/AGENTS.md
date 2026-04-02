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

## References

- [Deploying Zero](https://zero.rocicorp.dev/docs/deployment)
- [zero-cache configuration](https://zero.rocicorp.dev/docs/zero-cache-config)
- After **Drizzle** schema changes, regenerate **`packages/zero/src/zero-schema.gen.ts`** with `bun zero:generate` (repo root) — see [`docs/local-sync/workflow.md`](../../docs/local-sync/workflow.md#drizzle-zero-schema-generation).
