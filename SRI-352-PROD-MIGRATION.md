# SRI-352 — Production Migration Playbook

**Goal**: ship canonical merchant directory + match algorithm to prod without re-running every importer / rollup / domain-fill against prod. We snapshot local data tables and restore them into prod.

Run in this exact order. Each step is idempotent unless noted.

---

## 0. Pre-flight (read-only)

```bash
# Confirm prod URL + take a recent backup (PlanetScale console or pg_dump)
psql "$PROD_URL" -c "SELECT count(*) FROM transaction;"
psql "$PROD_URL" -c "SELECT count(*) FROM merchant;"            # expect 0 or stale
psql "$PROD_URL" -c "SELECT count(*) FROM merchant_location;"   # expect 0 or stale
psql "$PROD_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"
```

If prod has `merchant` / `merchant_location` rows, decide: truncate or merge. Default assumes empty/stale (truncate and reseed from local snapshot).

---

## 1. Baseline-mark migrations in prod

Same fix we applied locally. drizzle's migrator otherwise tries to re-run the introspection baseline (`flawless_lady_deathstrike`) whose body is commented out — splitter chokes on `--> statement-breakpoint` markers inside the `/* */` block.

```sql
-- Run only if drizzle.__drizzle_migrations is empty for these three rows
INSERT INTO drizzle.__drizzle_migrations (hash, name, created_at) VALUES
  ('ceb2412a05f3de13daacee0efccf703ce0261f6ea9541c55c7d06cdc93cbf9b5','20260526192354_flawless_lady_deathstrike',1779823434000),
  ('5382deb043d81880061d9849bc764455289113ba0383cf6c2595662b718ec0ae','20260606062442_flaky_newton_destine',1780727082000),
  ('6521b6aabaac3c03da99b8385c09421e62592f7aec3931900fafb7d5e6fb689b','20260606102106_wakeful_wildside',1780741266000)
ON CONFLICT DO NOTHING;
```

Verify drizzle now sees the new migration as pending:
```bash
MIGRATION_URI="$PROD_URL" bunx drizzle-kit status --config packages/db/drizzle.config.ts
```

---

## 2. Dedup any prod merchant rows by `name_normalized`

The new migration creates `UNIQUE (name_normalized) WHERE deleted_at IS NULL`. If prod has duplicates the migration fails. Locally we had **1032 dup groups**. Same query works on prod:

```sql
BEGIN;
WITH ranked AS (
  SELECT id, name_normalized,
         row_number() OVER (PARTITION BY name_normalized ORDER BY location_count DESC, created_at ASC, id ASC) AS rn
  FROM merchant WHERE deleted_at IS NULL
),
survivors AS (SELECT name_normalized, id AS keep_id FROM ranked WHERE rn = 1),
losers AS (
  SELECT r.id AS loser_id, s.keep_id
  FROM ranked r JOIN survivors s ON s.name_normalized = r.name_normalized
  WHERE r.rn > 1
)
UPDATE merchant_location ml SET merchant_id = l.keep_id, updated_at = now()
FROM losers l WHERE ml.merchant_id = l.loser_id;

WITH ranked AS (
  SELECT id, name_normalized,
         row_number() OVER (PARTITION BY name_normalized ORDER BY location_count DESC, created_at ASC, id ASC) AS rn
  FROM merchant WHERE deleted_at IS NULL
)
DELETE FROM merchant WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
COMMIT;
```

---

## 2b. Set pg_trgm GUC

The match engine's index-friendly trgm query uses the `%>` operator, which
honours `pg_trgm.word_similarity_threshold` (default 0.6 — too strict to
surface "Key Food" inside "Key Food Stores"). Lower it once per DB:

```sql
ALTER DATABASE <db-name> SET pg_trgm.word_similarity_threshold = 0.4;
```

Takes effect on new connections.

## 3. Apply the new migration

```bash
MIGRATION_URI="$PROD_URL" bun run packages/db/scripts/migrate-debug.ts --prod
```

Expect a single statement: `CREATE UNIQUE INDEX ... merchant_name_normalized_uniq ...`.

---

## 4. Replace prod merchant data with local snapshot

We've already imported + rolled up + domain-filled locally. Reproducing on prod = hours of API calls + Google Places spend. Snapshot + restore instead.

### 4a. Dump local (data-only, just the two tables)

```bash
bash packages/db/scripts/import/merchants/dump-merchant-tables.sh > /tmp/sri-352-merchants.sql
wc -l /tmp/sri-352-merchants.sql   # sanity check
```

Script enforces `--data-only --no-owner --no-acl --column-inserts` so it's portable and survives FK ordering (`merchant` first, then `merchant_location`).

### 4b. Truncate prod copies (only if stale data exists)

```sql
TRUNCATE merchant, merchant_location RESTART IDENTITY CASCADE;
```

> Skip if prod tables are empty.

### 4c. Restore

```bash
psql "$PROD_URL" -f /tmp/sri-352-merchants.sql
```

### 4d. Verify counts match local

```bash
psql "$PROD_URL" -c "SELECT 'merchant' t, count(*) FROM merchant UNION ALL SELECT 'merchant_location', count(*) FROM merchant_location;"
# Expect: merchant=63 587, merchant_location=77 132 (or whatever local shows at dump time)
```

---

## 5. Run backfill against prod txns

```bash
MIGRATION_URI="$PROD_URL" bun packages/db/scripts/import/merchants/backfill-enrichment.ts --apply
```

Watch `=== outcomes ===`. Investigate if `no_match` ratio looks worse than local.

---

## 6. Verify Plaid webhook enrichment fires

Trigger a Plaid sandbox in-store txn → confirm enrichTransactionsStep writes lat/lon/domain on the row.

---

## Rollback

If something goes wrong:

1. **Migration UNIQUE failed mid-create** — index creation is atomic; nothing to undo. Re-dedup, retry.
2. **Data restore wrong** — `TRUNCATE merchant, merchant_location CASCADE` and re-dump local with corrected data.
3. **Enrichment writes bad rows** — backfill respects `lockedFields` on `transaction`; undo by clearing the enriched columns where `locked_fields` doesn't include them. Single SQL per field.

---

## Files touched (this PR)

- `packages/db/src/schema/merchants/{merchant,merchant-location}.ts`
- `packages/db/scripts/import/merchants/*` (importers, rollup, brand-merge, domain-fill, backfill, debug scripts)
- `packages/db/src/migrations/20260607040646_merchant_name_normalized_uniq/`
- `packages/server-data/src/merchants/{find,normalize}.ts` (+ tests)
- `apps/server/src/workflows/plaid/sync/{steps,workflow}.ts` (enrichment integration)
- `apps/friends/src/components/map.tsx` (tabbed panel)
- `oxlint.config.ts` (relax server-data/merchants like ETL)
