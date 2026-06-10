#!/usr/bin/env tsx
/**
 * SRI-354 — load GeoNames US postal codes into `locality_zip`.
 *
 * Downloads https://download.geonames.org/export/zip/US.zip (~41k rows TSV),
 * parses, and bulk-inserts into Postgres via `\COPY` for speed. Idempotent:
 * truncates the table before insert (table is pure reference data — no FKs).
 *
 * Run: `bunx tsx packages/db/scripts/import/places/load-geonames-zips.ts`
 *
 * Requires DATABASE_URL or MIGRATION_URI pointing at the target DB. `psql`
 * must be on PATH.
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = path.resolve(HERE, "../../../../..");
dotenv.config({ path: path.join(MONOREPO_ROOT, "apps/server/.env") });

const GEONAMES_URL = "https://download.geonames.org/export/zip/US.zip";
const CACHE_DIR = "/tmp/geonames";
const ZIP_PATH = `${CACHE_DIR}/US.zip`;
const TSV_PATH = `${CACHE_DIR}/US.txt`;
const CSV_PATH = `${CACHE_DIR}/US.csv`;

async function download(): Promise<void> {
  if (existsSync(TSV_PATH)) {
    console.log(`[geonames] cached TSV exists at ${TSV_PATH}, skipping download`);
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.log(`[geonames] downloading ${GEONAMES_URL}`);
  const res = await fetch(GEONAMES_URL);
  if (!res.ok || !res.body) {
    throw new Error(`download failed: ${res.status}`);
  }
  const out = createWriteStream(ZIP_PATH);
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(res.body as unknown as ReadableStream)
      .pipe(out)
      .on("finish", resolve)
      .on("error", reject);
  });
  console.log(`[geonames] unzipping via system unzip`);
  const unzip = spawnSync("unzip", ["-o", "-j", ZIP_PATH, "US.txt", "-d", CACHE_DIR], {
    encoding: "utf-8",
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (unzip.status !== 0) {
    throw new Error("unzip failed (system `unzip` required on PATH)");
  }
}

/**
 * GeoNames US.txt columns (tab-separated):
 *   0 country, 1 postal_code, 2 place_name, 3 admin1_name, 4 admin1_code,
 *   5 admin2_name, 6 admin2_code, 7 admin3_name, 8 admin3_code,
 *   9 latitude, 10 longitude, 11 accuracy
 *
 * We map admin1_code → state, place_name → city, postal_code → zip5.
 */
async function tsvToCsv(): Promise<number> {
  const raw = await readFile(TSV_PATH, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  let rows = 0;
  const out: string[] = [];
  for (const line of lines) {
    const cols = line.split("\t");
    const zip = cols[1]?.trim();
    const city = cols[2]?.trim();
    const state = cols[4]?.trim().toUpperCase();
    const lat = cols[9]?.trim();
    const lon = cols[10]?.trim();
    if (!zip || !city || !state || state.length !== 2) {
      continue;
    }
    // Filter to 5-digit ZIPs (drop ZIP+4 / military APO/FPO oddities)
    if (!/^\d{5}$/.test(zip)) {
      continue;
    }
    // CSV-safe escape: wrap city in quotes, escape inner quotes
    const cityCsv = `"${city.replaceAll('"', '""')}"`;
    out.push(`${cityCsv},${state},${zip},${lat || ""},${lon || ""}`);
    rows += 1;
  }
  await writeFile(CSV_PATH, out.join("\n"));
  console.log(`[geonames] parsed ${rows} rows → ${CSV_PATH}`);
  return rows;
}

function bulkLoad(pgUrl: string): void {
  console.log(`[geonames] truncating + loading locality_zip`);
  // `\COPY` is a psql meta-command, so it must come through `-f` or stdin,
  // not `-c`. Pipe the whole block via stdin.
  // Wrap in explicit BEGIN/COMMIT — without it, autocommit mode on
  // PlanetScale Postgres lets the TRUNCATE commit independently of the
  // \COPY, which collides with the `cobalt_0` logical-replication publication
  // and silently wipes the COPYed rows (visible in the same psql session,
  // gone from a fresh connection).
  const sql = `BEGIN;
TRUNCATE TABLE locality_zip;
\\COPY locality_zip(city, state, zip5, lat, lon) FROM '${CSV_PATH}' WITH (FORMAT csv);
SELECT COUNT(*) AS rows FROM locality_zip;
COMMIT;
`;
  const res = spawnSync("psql", [pgUrl, "-v", "ON_ERROR_STOP=1"], {
    encoding: "utf-8",
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (res.status !== 0) {
    throw new Error(`psql exited with code ${res.status}`);
  }
}

async function main(): Promise<void> {
  const pgUrl =
    process.env.LOCAL_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.MIGRATION_URI;
  if (!pgUrl) {
    throw new Error("LOCAL_DATABASE_URL, DATABASE_URL, or MIGRATION_URI must be set");
  }
  await download();
  await tsvToCsv();
  bulkLoad(pgUrl);
  console.log("[geonames] done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
