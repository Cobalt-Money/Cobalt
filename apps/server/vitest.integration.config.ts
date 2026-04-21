/**
 * Server-based integration test runner.
 *
 * Uses `workflow/vite` for code transforms (not `@workflow/vitest` — that
 * plugin's in-process runtime breaks on our TS-source workspace packages, see
 * SRI-255). Tests call `start()` against a real Nitro dev server spawned by
 * the setup file.
 *
 * Prerequisites before running `bun run test:integration`:
 *   1. `bun run db:local:up` — start local Postgres in docker
 *   2. `bun run db:migrate:local` — apply migrations to local PG
 *   3. (optional) `bun run db:local:grants` — role grants if you haven't yet
 *   4. Real `STOCK_NEWS_API_KEY` in apps/server/.env (read by the spawned Nitro)
 *
 * The spawn file waits for Nitro's "listening" output before letting tests
 * start, and terminates the server on teardown.
 */

import { defineConfig } from "vitest/config";
import { workflow } from "workflow/vite";

export default defineConfig({
  // workflow/vite is typed against Vite 7; vitest/config here resolves Vite 8.
  // Shapes are compatible at runtime — biome-ignore / eslint-disable-next-line
  // @ts-expect-error -- dual Vite type mismatch at workspace resolution
  plugins: [workflow()],
  test: {
    env: {
      // Point the spawned Nitro at docker-hosted Postgres (port 5433 per
      // docker-compose.local-db.yml). Integration tests MUST NOT touch the
      // shared `DATABASE_URL` — that's a live dev/prod PlanetScale.
      LOCAL_DATABASE_URL:
        "postgresql://postgres:postgres@127.0.0.1:5433/cobalt",
      WORKFLOW_LOCAL_BASE_URL: "http://localhost:4000",
    },
    environment: "node",
    globalSetup: ["./tests/integration-spawn.ts"],
    globals: true,
    include: ["tests/**/*.integration.test.ts"],
    testTimeout: 60_000,
  },
});
