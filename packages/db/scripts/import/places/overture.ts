#!/usr/bin/env tsx
/**
 * SRI-354 — Overture → Postgres importer (thin wrapper).
 *
 * The real work lives in overture.sql; this file just:
 *   1. Resolves the latest Overture release (or honors $OVERTURE_RELEASE).
 *   2. Reads the SQL file + substitutes ${PG_URL} and ${RELEASE}.
 *   3. Pipes it into the `duckdb` CLI and streams the output.
 *
 * Run: `pnpm tsx packages/db/scripts/import/places/overture.ts`
 * Requires the `duckdb` binary on PATH (≥ 1.1) — extensions are auto-installed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SQL_FULL = path.join(HERE, "overture.sql");
const SQL_FAST = path.join(HERE, "overture-fast.sql");
const SQL_BULKLOAD = path.join(HERE, "overture-bulkload.sql");
const LOCAL_CACHE = "/tmp/overture_food_retail.parquet";
const MONOREPO_ROOT = path.resolve(HERE, "../../../../..");

// Load DB URL from apps/server/.env without invoking the t3-env validator
// (which fails when unrelated Plaid / Stripe / SnapTrade keys are absent).
dotenv.config({ path: path.join(MONOREPO_ROOT, "apps/server/.env") });

/** Known-good fallback when $OVERTURE_RELEASE is unset and listing fails. */
const FALLBACK_RELEASE = "2026-05-20.0";

/**
 * Empty-table probe via psql. Drives the bulkload-vs-upsert branch: a populated
 * table cannot tolerate the DROP/CREATE INDEX dance because concurrent writers
 * would hit unindexed scans. Returns false on any psql error so we degrade to
 * the safer upsert path.
 */
function isPlaceTableEmpty(pgUrl: string): boolean {
  const res = spawnSync("psql", [pgUrl, "-tAc", "SELECT COUNT(*) FROM place"], {
    encoding: "utf-8",
  });
  if (res.status !== 0) {
    return false;
  }
  return res.stdout.trim() === "0";
}

async function resolveRelease(): Promise<string> {
  if (process.env.OVERTURE_RELEASE) {
    return process.env.OVERTURE_RELEASE;
  }
  try {
    const res = await fetch(
      "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/",
    );
    const xml = await res.text();
    const prefixes = [...xml.matchAll(/<Prefix>release\/([^<]+)\/<\/Prefix>/g)].map((m) => m[1]!);
    const latest = prefixes.toSorted().at(-1);
    return latest ?? FALLBACK_RELEASE;
  } catch {
    return FALLBACK_RELEASE;
  }
}

async function main() {
  const pgUrl = process.env.LOCAL_DATABASE_URL ?? process.env.MIGRATION_URI;
  if (!pgUrl) {
    throw new Error("LOCAL_DATABASE_URL or MIGRATION_URI must be set");
  }
  const release = await resolveRelease();
  const useCache = existsSync(LOCAL_CACHE);
  const tableEmpty = useCache && isPlaceTableEmpty(pgUrl);
  let sqlPath: string;
  let mode: string;
  if (tableEmpty) {
    sqlPath = SQL_BULKLOAD;
    mode = "bulkload (drop indexes + COPY + rebuild)";
  } else if (useCache) {
    sqlPath = SQL_FAST;
    mode = "fast (local cache + upsert)";
  } else {
    sqlPath = SQL_FULL;
    mode = "full (S3 scan)";
  }
  console.log(
    `[overture] release=${release} target=${pgUrl.replace(/:[^@]+@/, ":***@")} mode=${mode}`,
  );

  const template = readFileSync(sqlPath, "utf-8");
  const sql = template.replaceAll("__PG_URL__", pgUrl).replaceAll("__RELEASE__", release);

  const child = spawn("duckdb", [], { stdio: ["pipe", "inherit", "inherit"] });
  child.stdin.write(sql);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve) =>
    child.on("exit", (code) => resolve(code ?? 1)),
  );
  if (exitCode !== 0) {
    throw new Error(`duckdb exited with code ${exitCode}`);
  }
  console.log("[overture] done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
