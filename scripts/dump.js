#!/usr/bin/env bun
import { resolve } from "node:path";

/**
 * `pg_dump | pg_restore` via Docker. See docs/local-sync/workflow.md
 *
 * - Uses postgres:18 by default (match docker-compose.local-db.yml): `pg_dump` must be ≥ server major
 *   (PlanetScale prod is PG18). DUMP_PG_DUMP_IMAGE / DUMP_PG_RESTORE_IMAGE override each step.
 * - Restores as superuser on localhost (postgres/postgres) so RLS does not block COPY; override with
 *   DUMP_RESTORE_URL if your local superuser password differs.
 * - Excludes Zero replication schemas and Drizzle migration rows (already applied by `db:migrate`).
 *
 * Read source (first set wins): MIGRATION_URI → DATABASE_URL. No extra env — use MIGRATION_URI for your
 * PlanetScale migration connection when LOCAL_DATABASE_URL is set for local Drizzle.
 *
 * Args:
 *   --full — schema + data (omit --data-only)
 *   --replace — before restore, TRUNCATE all public/drizzle tables except __drizzle_migrations (use when
 *               re-running dump into a DB that already has rows; first run on empty DB does not need this)
 *
 * Env: DUMP_PG_IMAGE, DUMP_PG_DUMP_IMAGE, DUMP_PG_RESTORE_IMAGE, DUMP_RESTORE_URL,
 *      DUMP_EXCLUDE_SCHEMAS (extra comma-separated schema names)
 */
import { config } from "dotenv";
config({ path: resolve(import.meta.dir, "../apps/server/.env"), quiet: true });
const src = process.env.MIGRATION_URI ?? process.env.DATABASE_URL;
const dst =
  process.env.LOCAL_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5433/cobalt";
const dumpImg = process.env.DUMP_PG_DUMP_IMAGE ?? process.env.DUMP_PG_IMAGE ?? "postgres:18";
const restoreImg = process.env.DUMP_PG_RESTORE_IMAGE ?? process.env.DUMP_PG_IMAGE ?? "postgres:18";
const full = process.argv.includes("--full");
const replace = process.argv.includes("--replace");
if (!src) {
  process.stderr.write("dump: set MIGRATION_URI or DATABASE_URL\n");
  process.exit(1);
}
const defaultExcludeSchemas = ["zero", "zero_0", "zero_0/cdc", "zero_0/cvr"];
const extraExcludeSchemas = (process.env.DUMP_EXCLUDE_SCHEMAS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const excludeSchemaArgs = [...defaultExcludeSchemas, ...extraExcludeSchemas].flatMap((name) => [
  "--exclude-schema",
  name,
]);
/** LIKE patterns: `_` is a wildcard; escape as `\_` so `__drizzle_migrations` matches literally. */
const excludeDrizzleMigrationData = [
  "--exclude-table-data=public.\\_\\_drizzle_migrations",
  "--exclude-table-data=drizzle.\\_\\_drizzle_migrations",
];
/** pg_restore must run as superuser so COPY is not blocked by RLS. */
function restoreConnectionUrl() {
  const explicit = process.env.DUMP_RESTORE_URL;
  if (explicit) {
    return explicit;
  }
  try {
    const u = new URL(dst);
    const local =
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.hostname === "host.docker.internal";
    if (local) {
      u.username = "postgres";
      u.password = "postgres";
    }
    return u.toString();
  } catch {
    return dst;
  }
}
function forDockerRestore(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") {
      u.hostname = "host.docker.internal";
    }
    return u.toString();
  } catch {
    return url;
  }
}
const restoreUrl = forDockerRestore(restoreConnectionUrl());
const linuxHost =
  process.platform === "linux" ? ["--add-host", "host.docker.internal:host-gateway"] : [];
/** Clear local app data so a data-only COPY does not hit duplicate PKs (re-dump / refresh). */
function truncateLocalAppTables() {
  if (full) {
    process.stderr.write("dump: --replace ignored with --full (use empty DB or db:local:reset)\n");
    return Promise.resolve(0);
  }
  const sql = `DO $truncate$
DECLARE
  stmt text;
BEGIN
  SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', schemaname, tablename), ', ' ORDER BY schemaname, tablename) || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname IN ('public', 'drizzle')
  AND tablename <> '__drizzle_migrations';
  IF stmt IS NOT NULL THEN
    EXECUTE stmt;
  END IF;
END
$truncate$;`;
  const proc = Bun.spawn(
    [
      "docker",
      "run",
      "--rm",
      "-i",
      ...linuxHost,
      restoreImg,
      "psql",
      restoreUrl,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    {
      stderr: "inherit",
      stdin: new TextEncoder().encode(sql),
      stdout: "inherit",
    },
  );
  return proc.exited;
}
if (replace) {
  process.stderr.write(
    "dump: --replace: truncating public/drizzle tables (except __drizzle_migrations)\n",
  );
  const t = await truncateLocalAppTables();
  if (t !== 0) {
    process.exit(1);
  }
}
const dump = Bun.spawn(
  [
    "docker",
    "run",
    "--rm",
    "-i",
    dumpImg,
    "pg_dump",
    src,
    "--no-owner",
    "--no-acl",
    ...(full ? [] : ["--data-only"]),
    ...excludeDrizzleMigrationData,
    ...excludeSchemaArgs,
    "-Fc",
  ],
  { stderr: "inherit", stdout: "pipe" },
);
const restore = Bun.spawn(
  [
    "docker",
    "run",
    "--rm",
    "-i",
    ...linuxHost,
    restoreImg,
    "pg_restore",
    "--no-owner",
    "--no-acl",
    "-d",
    restoreUrl,
  ],
  { stderr: "inherit", stdin: dump.stdout, stdout: "inherit" },
);
const [a, b] = await Promise.all([dump.exited, restore.exited]);
process.exit(a !== 0 || b !== 0 ? 1 : 0);
