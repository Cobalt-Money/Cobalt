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
  // No pgRole() declared in schema. drizzle-kit rc.4 with roles:true tries to
  // DROP every role it sees in the DB (including pg system roles like
  // pg_checkpoint), which aborts push before enrichment.place is created.
  entities: {
    roles: false,
  },
  out: path.resolve(__dirname, "src/migrations"),
  // All tables drizzle-kit should manage. This is a superset of the tables
  // exposed to Zero replication (see ./src/schema/zero-schema.ts).
  schema: path.resolve(__dirname, "src/schema/schema.ts"),
  // Manage `public` + `enrichment` (server-only places + enrichment_event,
  // see SRI-244 / SRI-354). External schemas (`zero*` owned by Rocicorp Zero
  // replication, `archive` owned out-of-band) must not be diffed against the
  // declared TS schema — otherwise drizzle-kit generate proposes DROP SCHEMA
  // on every run.
  schemaFilter: ["public", "enrichment"],
  strict: true,
  verbose: true,
});
