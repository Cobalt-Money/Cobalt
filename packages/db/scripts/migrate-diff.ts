import crypto from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { Client } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.resolve(monorepoRoot, "apps/server/.env") });

const url = process.env.MIGRATION_URI ?? process.env.LOCAL_DATABASE_URL;
if (!url) {
  throw new Error("MIGRATION_URI or LOCAL_DATABASE_URL must be set");
}

const redacted = url.replace(/\/\/[^@]+@/, "//***@");
console.log(`[migrate-diff] target: ${redacted}\n`);

const migrationsDir = path.resolve(__dirname, "../src/migrations");
const dirs = readdirSync(migrationsDir)
  .filter((d) => {
    try {
      readFileSync(path.join(migrationsDir, d, "migration.sql"));
      return true;
    } catch {
      return false;
    }
  })
  .toSorted();

const local = dirs.map((name) => {
  const sql = readFileSync(
    path.join(migrationsDir, name, "migration.sql"),
    "utf-8"
  );
  const hash = crypto.createHash("sha256").update(sql).digest("hex");
  const dateStr = name.slice(0, 14);
  const folderMillis = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(4, 6)) - 1,
    Number(dateStr.slice(6, 8)),
    Number(dateStr.slice(8, 10)),
    Number(dateStr.slice(10, 12)),
    Number(dateStr.slice(12, 14))
  );
  return { folderMillis, hash, name };
});

const client = new Client({ connectionString: url });
await client.connect();
const { rows } = await client.query<{
  id: number;
  hash: string;
  created_at: string;
  name: string | null;
}>(
  `SELECT id, hash, created_at, name FROM drizzle.__drizzle_migrations ORDER BY id`
);
await client.end();

const dbHashes = new Set(rows.map((r) => r.hash));
const dbNames = new Set(rows.map((r) => r.name));

console.log(`local migrations: ${local.length}`);
console.log(`db rows:          ${rows.length}\n`);

const missing = local.filter((m) => !dbHashes.has(m.hash));
const extra = rows.filter((r) => !local.some((m) => m.hash === r.hash));

console.log(`MISSING in db (will be re-applied — DANGER if SQL already ran):`);
for (const m of missing) {
  const nameMatch = dbNames.has(m.name)
    ? " [name exists w/ different hash]"
    : "";
  console.log(`  - ${m.name}${nameMatch}`);
  console.log(`    hash:   ${m.hash}`);
  console.log(`    millis: ${m.folderMillis}`);
}

console.log(`\nEXTRA in db (rows w/ no matching local file):`);
for (const r of extra) {
  console.log(`  - ${r.name ?? "<null>"}  hash=${r.hash}  id=${r.id}`);
}

console.log(`\nProposed catch-up INSERTs (do NOT run blindly):\n`);
for (const m of missing) {
  console.log(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name) VALUES ('${m.hash}', ${m.folderMillis}, '${m.name}');`
  );
}
