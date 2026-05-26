import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = import.meta.dirname;
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
  // All tables drizzle-kit should manage. This is a superset of the tables
  // exposed to Zero replication (see ./src/schema/zero-schema.ts).
  schema: path.resolve(__dirname, "src/schema/schema.ts"),
  // Only manage `public`. External schemas (`zero*` owned by Rocicorp Zero
  // replication, `archive` owned out-of-band) must not be diffed against the
  // declared TS schema — otherwise drizzle-kit generate proposes DROP SCHEMA
  // on every run.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
