import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../..");

dotenv.config({
  path: path.resolve(monorepoRoot, "apps/server/.env"),
});

const { env } = await import("@cobalt-web/env/server");

const url = env.LOCAL_DATABASE_URL ?? env.MIGRATION_URI;
if (!url) {
  throw new Error("Either LOCAL_DATABASE_URL or MIGRATION_URI must be set");
}

export default defineConfig({
  dbCredentials: {
    url,
  },
  dialect: "postgresql",
  entities: {
    roles: true,
  },
  out: path.resolve(__dirname, "src/migrations"),
  schema: path.resolve(__dirname, "src/schema"),
  strict: true,
  verbose: true,
});
