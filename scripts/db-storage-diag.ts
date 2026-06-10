#!/usr/bin/env bun
/**
 * Full storage diagnostic for PlanetScale Postgres (cobalt db).
 *
 * Surfaces what consumes cluster disk: actual DB size, top tables/indexes,
 * logical replication slots + WAL pinned, walsender activity, publications,
 * Zero CVR/CDC schemas, and CVR last-active per slot.
 *
 * Must run against primary via ZERO_UPSTREAM_DB — replicas hide logical slots
 * (`recovery is in progress`). See SRI-244.
 *
 * Usage:
 *   bun scripts/db-storage-diag.ts
 */

import { resolve } from "node:path";

import { config } from "dotenv";

config({
  path: resolve(import.meta.dir, "../apps/zero-cache/.env"),
  quiet: true,
});

const rawUrl = process.env.ZERO_UPSTREAM_DB;
if (!rawUrl) {
  process.stderr.write("db-storage-diag: set ZERO_UPSTREAM_DB in apps/zero-cache/.env\n");
  process.exit(1);
}
const url = rawUrl.replace("sslmode=verify-full", "sslmode=require");
const appId = process.env.ZERO_APP_ID;

async function psql(sql: string): Promise<string> {
  const proc = Bun.spawn(["psql", url, "--no-psqlrc", "-tA", "-F", "|", "-c", sql], {
    stderr: "inherit",
    stdout: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return out.trim();
}

function rows(raw: string): string[][] {
  return raw
    ? raw
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("|"))
    : [];
}

function section(title: string) {
  console.log(`\n=== ${title} ===\n`);
}

function table(headers: string[], data: string[][]) {
  if (data.length === 0) {
    console.log("(none)");
    return;
  }
  const widths = headers.map((h, i) => Math.max(h.length, ...data.map((r) => (r[i] ?? "").length)));
  console.log(headers.map((h, i) => h.padEnd(widths[i])).join("  "));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of data) {
    console.log(r.map((c, i) => (c ?? "").padEnd(widths[i])).join("  "));
  }
}

// --- 1. Cluster + DB size

section("Database size");
const dbSize = rows(
  await psql(`
    SELECT current_database(),
           pg_size_pretty(pg_database_size(current_database())),
           pg_size_pretty(sum(pg_total_relation_size(c.oid)))::text
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
       AND c.relkind IN ('r','m','i','t')
  `),
);
table(["database", "pg_database_size", "sum(relations)"], dbSize);

// --- 2. Top tables + indexes

section("Top 20 relations by total size");
const topRels = rows(
  await psql(`
    SELECT n.nspname || '.' || c.relname,
           c.relkind,
           pg_size_pretty(pg_total_relation_size(c.oid)),
           pg_size_pretty(pg_relation_size(c.oid))
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r','m','i')
       AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
     ORDER BY pg_total_relation_size(c.oid) DESC
     LIMIT 20
  `),
);
table(["relation", "kind", "total", "heap"], topRels);

// --- 3. Logical replication slots — the WAL story

section("Logical replication slots");
const slotRows = rows(
  await psql(`
    SELECT slot_name,
           active,
           wal_status,
           pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)),
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn),
           coalesce(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)), '')
      FROM pg_replication_slots
     WHERE slot_type = 'logical'
     ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC NULLS LAST
  `),
);
table(["slot_name", "active", "wal_status", "retained_wal", "bytes", "confirm_lag"], slotRows);

const totalPinned = slotRows.reduce((s, r) => s + Number(r[4] || 0), 0);
console.log(`\nTotal WAL pinned by logical slots: ${(totalPinned / 1_073_741_824).toFixed(2)} GB`);

const leaked = slotRows.filter((r) => r[1] === "f");
if (leaked.length > 0) {
  console.log(`\n⚠️  ${leaked.length} inactive slot(s) — these leak WAL until dropped:`);
  for (const r of leaked) {
    console.log(`   - ${r[0]} (${r[3]})`);
  }
}

const expectedPrefix = appId ? `${appId}_0` : null;
if (expectedPrefix) {
  const unexpected = slotRows.filter((r) => !r[0].startsWith(expectedPrefix));
  if (unexpected.length > 0) {
    console.log(`\n⚠️  Slots not matching current ZERO_APP_ID="${appId}":`);
    for (const r of unexpected) {
      console.log(`   - ${r[0]}`);
    }
  }
}

// --- 4. Walsenders — who is reading slots right now

section("Active walsenders");
table(
  ["application", "client_addr", "state", "sent_lag", "write_lag", "flush_lag", "backend_start"],
  rows(
    await psql(`
      SELECT coalesce(application_name,''),
             coalesce(client_addr::text,''),
             state,
             coalesce(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)),''),
             coalesce(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)),''),
             coalesce(pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)),''),
             backend_start::text
        FROM pg_stat_replication
    `),
  ),
);

// --- 5. Publications

section("Publications + table counts");
table(
  ["pubname", "tables"],
  rows(
    await psql(`
      SELECT p.pubname,
             (SELECT count(*)::text FROM pg_publication_tables t WHERE t.pubname = p.pubname)
        FROM pg_publication p
       ORDER BY p.pubname
    `),
  ),
);

// --- 6. Zero CVR/CDC schemas (each ~50 MB; leftover ones = dead app ids)

section("Zero CVR/CDC schemas");
table(
  ["schema", "size"],
  rows(
    await psql(`
      SELECT n.nspname,
             pg_size_pretty(coalesce(sum(pg_total_relation_size(c.oid)), 0))
        FROM pg_namespace n
        LEFT JOIN pg_class c
          ON c.relnamespace = n.oid AND c.relkind IN ('r','m','i')
       WHERE n.nspname ~ '/(cvr|cdc)$' OR n.nspname ~ '_0$' OR n.nspname IN ('zero','zero_dev_0')
       GROUP BY n.nspname
       ORDER BY n.nspname
    `),
  ),
);

// --- 7. CVR instances — last_active per app id (catches abandoned dev slots)

section("CVR instances last_active (per Zero app id)");
const cvrSchemas = rows(
  await psql(`
    SELECT n.nspname FROM pg_namespace n WHERE n.nspname ~ '/cvr$' ORDER BY n.nspname
  `),
).map((r) => r[0]);
for (const schema of cvrSchemas) {
  const r = rows(
    await psql(`
      SELECT '${schema}',
             coalesce(max("lastActive")::text, ''),
             coalesce((now() - max("lastActive"))::text, ''),
             count(*)::text
        FROM "${schema}".instances
    `),
  );
  table(["schema", "last_active", "idle_for", "instances"], r);
}

console.log("");
console.log("Done. Investigate any ⚠️ above.");
console.log("To drop leaked slots after manual review: bun scripts/check-slots.ts --drop");
console.log("Then DROP SCHEMA/PUBLICATION for dead app ids per SRI-244 runbook.");
