import crypto from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { Client } from "pg";

const __dirname = import.meta.dirname;
const monorepoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(monorepoRoot, "apps/server/.env") });

const url = process.env.MIGRATION_URI;
if (!url) {
  throw new Error("MIGRATION_URI required");
}

const migrationsDir = path.resolve(__dirname, "../src/migrations");
const local = readdirSync(migrationsDir)
  .filter((d) => {
    try {
      readFileSync(path.join(migrationsDir, d, "migration.sql"));
      return true;
    } catch {
      return false;
    }
  })
  .map((name) => {
    const sql = readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf-8");
    return {
      hash: crypto.createHash("sha256").update(sql).digest("hex"),
      name,
    };
  });

const client = new Client({ connectionString: url });
await client.connect();
const { rows } = await client.query<{
  id: number;
  hash: string;
  name: string | null;
}>(`SELECT id, hash, name FROM drizzle.__drizzle_migrations WHERE name IS NULL ORDER BY id`);

console.log(`null-name rows in db: ${rows.length}\n`);
const proposed: { id: number; name: string }[] = [];
for (const r of rows) {
  const m = local.find((l) => l.hash === r.hash);
  if (m) {
    console.log(`  id=${r.id} hash=${r.hash.slice(0, 12)}… → ${m.name}`);
    proposed.push({ id: r.id, name: m.name });
  } else {
    console.log(`  id=${r.id} hash=${r.hash.slice(0, 12)}… → NO LOCAL MATCH (skip)`);
  }
}

console.log(`\nProposed UPDATEs:\n`);
for (const p of proposed) {
  console.log(`UPDATE drizzle.__drizzle_migrations SET name = '${p.name}' WHERE id = ${p.id};`);
}

if (process.argv.includes("--apply")) {
  console.log(`\n[applying ${proposed.length} updates...]`);
  for (const p of proposed) {
    await client.query(
      `UPDATE drizzle.__drizzle_migrations SET name = $1 WHERE id = $2 AND name IS NULL`,
      [p.name, p.id],
    );
  }
  console.log("done.");
}

await client.end();
