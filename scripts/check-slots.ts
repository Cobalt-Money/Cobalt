#!/usr/bin/env bun
/**
 * Checks PlanetScale for leaked logical replication slots pinning WAL.
 *
 * Must run against the admin postgres role (ZERO_UPSTREAM_DB) — the MCP read
 * tool routes to a replica and won't show logical slots. See SRI-244.
 *
 * Usage:
 *   bun scripts/check-slots.ts            # report only
 *   bun scripts/check-slots.ts --drop     # drop inactive slots + CHECKPOINT
 */

import { resolve } from "node:path";

import { config } from "dotenv";

config({
  path: resolve(import.meta.dir, "../apps/zero-cache/.env"),
  quiet: true,
});

const rawUrl = process.env.ZERO_UPSTREAM_DB;
if (!rawUrl) {
  process.stderr.write("check-slots: set ZERO_UPSTREAM_DB in apps/zero-cache/.env\n");
  process.exit(1);
}
// verify-full requires a root cert that's not always present locally; fall back to require
const url = rawUrl.replace("sslmode=verify-full", "sslmode=require");

const drop = process.argv.includes("--drop");

// Use psql so we don't need to install a pg client package.
// Runs as the role embedded in ZERO_UPSTREAM_DB (should be postgres admin).
function psql(sql: string): Promise<string> {
  const proc = Bun.spawn(["psql", url, "--no-psqlrc", "-tA", "-c", sql], {
    stderr: "inherit",
    stdout: "pipe",
  });
  return new Response(proc.stdout).text();
}

const slotQuery = `
SELECT slot_name, active, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY retained_bytes DESC NULLS LAST;
`.trim();

const raw = await psql(slotQuery);
const rows = raw
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [slot_name, active, wal_status, retained_wal, retained_bytes] = line.split("|");
    return {
      active: active === "t",
      retained_bytes: Number(retained_bytes ?? 0),
      retained_wal,
      slot_name,
      wal_status,
    };
  });

if (rows.length === 0) {
  console.log("check-slots: no logical replication slots found.");
  process.exit(0);
}

// Slots we expect to exist
// Only the active prod slot is expected; inactive dev slots still leak WAL
const KNOWN_ACTIVE_PATTERN = /^zero_0_/; // prod slot only

const leaked = rows.filter((r) => !r.active && !KNOWN_ACTIVE_PATTERN.test(r.slot_name));
const totalLeakedBytes = leaked.reduce((s, r) => s + r.retained_bytes, 0);

console.log("\n=== Logical replication slots ===\n");
console.log("slot_name".padEnd(50), "active".padEnd(8), "wal_status".padEnd(12), "retained_wal");
console.log("-".repeat(90));
for (const r of rows) {
  const flag = leaked.includes(r) ? " ⚠️" : "";
  console.log(
    r.slot_name.padEnd(50),
    String(r.active).padEnd(8),
    r.wal_status.padEnd(12),
    r.retained_wal + flag,
  );
}

if (leaked.length === 0) {
  console.log("\n✓ No leaked inactive slots detected.");
  process.exit(0);
}

const totalHuman = (totalLeakedBytes / 1_073_741_824).toFixed(2);
console.log(
  `\n⚠️  ${leaked.length} leaked inactive slot(s) retaining ~${totalHuman} GB of WAL total.\n`,
);

if (!drop) {
  console.log("To drop them, run:\n");
  console.log(`  bun scripts/check-slots.ts --drop`);
  console.log("\nOr individually:");
  for (const r of leaked) {
    console.log(
      `  psql "$ZERO_UPSTREAM_DB" -c "SELECT pg_drop_replication_slot('${r.slot_name}');"`,
    );
  }
  process.exit(1); // non-zero so CI can catch this
}

// --drop mode
console.log("Dropping leaked slots...\n");
for (const r of leaked) {
  process.stdout.write(`  Dropping ${r.slot_name} (${r.retained_wal})... `);
  await psql(`SELECT pg_drop_replication_slot('${r.slot_name}')`);
  console.log("done");
}

console.log("\nRunning CHECKPOINT...");
await psql("CHECKPOINT");
console.log("done\n");

console.log("Remaining slots after cleanup:");
const after = await psql(slotQuery);
console.log(after || "(none)");
