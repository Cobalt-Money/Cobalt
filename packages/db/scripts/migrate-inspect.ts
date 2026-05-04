import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(monorepoRoot, "apps/server/.env") });

const url = process.env.MIGRATION_URI;
if (!url) {
  throw new Error("MIGRATION_URI required");
}

const client = new Client({ connectionString: url });
await client.connect();
const { rows } = await client.query(
  `SELECT id, hash, created_at, name FROM drizzle.__drizzle_migrations ORDER BY id`,
);
await client.end();
console.log(JSON.stringify(rows, null, 2));
