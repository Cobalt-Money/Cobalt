-- SRI-244 follow-up — move server-only `place` + `enrichment_event` tables
-- into a dedicated `enrichment` schema.
--
-- Why: Zero's default publication is `FOR TABLES IN SCHEMA public`, which
-- has no per-table exclude. Keeping `place` (3M rows) in `public` forced the
-- Railway zero-cache replicator to mirror the whole table into its SQLite
-- volume, which hit `SQLITE_FULL` and orphaned slot `cobalt_0_b` (~6 GB WAL
-- pinned on PlanetScale). Moving these tables out of `public` is the
-- Postgres-native way to exclude them — no publication enumeration, no
-- per-table maintenance, future server-only tables drop into `enrichment`.
--
-- `ALTER TABLE ... SET SCHEMA` rewrites pg_class entries and rebinds
-- cross-schema FK targets in place — no row movement, no rebuild, instant.

CREATE SCHEMA IF NOT EXISTS "enrichment";
--> statement-breakpoint
-- Idempotent: skip the move if the table already lives in `enrichment`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'place'
  ) THEN
    EXECUTE 'ALTER TABLE public.place SET SCHEMA enrichment';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'enrichment_event'
  ) THEN
    EXECUTE 'ALTER TABLE public.enrichment_event SET SCHEMA enrichment';
  END IF;
END $$;
-- NOTE: Dropping the orphaned `cobalt_0_b` replication slot is intentionally
-- excluded from this migration. The drizzle migration role
-- (`pscale_api_mw3iysywdnd5`) does not have the REPLICATION attribute on
-- PlanetScale and `pg_drop_replication_slot` requires it. The slot must be
-- dropped out-of-band using the Zero-owned role whose credentials live in
-- Railway's `ZERO_CVR_DB` / `ZERO_CHANGE_DB` env vars. See SRI-244 runbook.
