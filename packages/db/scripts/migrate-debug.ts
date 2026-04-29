import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.resolve(monorepoRoot, "apps/server/.env") });

const args = new Set(process.argv.slice(2));
const isLocal = args.has("--local");
const isProd = args.has("--prod");

if (isLocal === isProd) {
  console.error("[migrate] must pass exactly one of --local or --prod");
  process.exit(2);
}

const url = isLocal
  ? "postgresql://postgres:postgres@127.0.0.1:5433/cobalt"
  : process.env.MIGRATION_URI;

if (!url) {
  throw new Error("MIGRATION_URI must be set for --prod");
}

const redacted = url.replace(/\/\/[^@]+@/, "//***@");
console.log(`[migrate] target (${isLocal ? "local" : "prod"}): ${redacted}`);

const db = drizzle(url);
try {
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../src/migrations"),
  });
  console.log("[migrate] success");
  process.exit(0);
} catch (error) {
  console.error("[migrate] FAILED:", error);
  process.exit(1);
}
