/**
 * Same migration path as `drizzle-kit migrate`, but prints the full Postgres error.
 * Use when `bun db:migrate` exits 1 without a useful message.
 *
 * From repo root: `bun run --cwd packages/db migrate:debug`
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(packageRoot, "../..");

dotenv.config({
  path: path.resolve(monorepoRoot, "apps/server/.env"),
});

const { env } = await import("@cobalt-web/env/server");
const connectionString = env.LOCAL_DATABASE_URL ?? env.MIGRATION_URI;

const pool = new Pool({ connectionString });
const db = drizzle({ client: pool });

try {
  await migrate(db, {
    migrationsFolder: path.resolve(packageRoot, "src/migrations"),
  });
  console.log("Migrations applied successfully.");
} catch (error) {
  console.error("Migration failed:\n");
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; detail?: string };
    if (e.message) {
      console.error(e.message);
    }
    if (e.code) {
      console.error(`code: ${e.code}`);
    }
    if (e.detail) {
      console.error(`detail: ${e.detail}`);
    }
  }
  console.error(error);
  process.exit(1);
} finally {
  await pool.end();
}
