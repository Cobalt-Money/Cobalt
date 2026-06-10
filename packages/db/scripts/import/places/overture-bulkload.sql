-- SRI-354 — Overture import bulk-load path.
--
-- First-load only: drops the trgm GIN + GIST geo indexes, COPY-streams ~1.5M
-- rows from the cached parquet, then rebuilds the indexes. Index maintenance
-- during a 1.5M-row INSERT was the OOM source on the prior run; dropping +
-- rebuilding takes seconds on an empty table since maintenance_work_mem is
-- bumped session-wide.
--
-- Selected by overture.ts when the `place` table is empty. Refresh runs
-- (table populated) fall back to overture-fast.sql which keeps indexes and
-- uses ON CONFLICT for incremental upserts.
--
-- Index DDL mirrored from migrations/20260608193939_foamy_vector/migration.sql.
-- Update both when schema/relations.ts changes.

INSTALL postgres; LOAD postgres;

ATTACH '__PG_URL__' AS pg (TYPE postgres);

CALL postgres_execute('pg', 'SET maintenance_work_mem = ''2GB''');
CALL postgres_execute('pg', 'SET synchronous_commit = OFF');

-- Drop the indexes that dominate per-row INSERT cost. PK + unique stay.
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_brand_name_normalized_trgm');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_brand_name_compact_trgm');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_geo_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_brand_key_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_region_city_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_postal_region_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_store_number_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_category_idx');
CALL postgres_execute('pg', 'DROP INDEX IF EXISTS place_brand_domain_idx');

-- Bulk insert — no ON CONFLICT (table is empty, unique constraint catches dups
-- across cross-source merges that DuckDB staging already collapsed).
INSERT INTO pg.place (
  id,
  brand_key, brand_name, brand_name_normalized, brand_name_compact,
  brand_domain, category, subtype, raw_name, store_number,
  address, city, region, postal_code, country, lat, lon, phone,
  source, source_id, source_updated_at,
  also_seen_in, is_active, created_at, updated_at
)
SELECT
  uuid()        AS id,
  brand_key, brand_name, brand_name_normalized, brand_name_compact,
  brand_domain, category, subtype, raw_name, store_number,
  address, city, region, postal_code, country, lat, lon, phone,
  source, source_id, source_updated_at,
  '[]'::JSON    AS also_seen_in,
  TRUE          AS is_active,
  now()         AS created_at,
  now()         AS updated_at
FROM read_parquet('/tmp/overture_food_retail.parquet');

-- Rebuild indexes. Bulk-build via maintenance_work_mem is far cheaper than
-- per-row maintenance during INSERT.
CALL postgres_execute('pg', 'CREATE INDEX place_brand_key_idx ON place (brand_key) WHERE (deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_brand_name_normalized_trgm ON place USING gin (brand_name_normalized gin_trgm_ops) WHERE (deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_brand_name_compact_trgm ON place USING gin (brand_name_compact gin_trgm_ops) WHERE (deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_region_city_idx ON place (region, city) WHERE (deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_postal_region_idx ON place (postal_code, region) WHERE (postal_code IS NOT NULL AND deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_store_number_idx ON place (brand_key, store_number) WHERE (store_number IS NOT NULL AND deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_geo_idx ON place USING gist (ll_to_earth(lat, lon)) WHERE (lat IS NOT NULL AND lon IS NOT NULL AND deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_category_idx ON place (category) WHERE (deleted_at IS NULL)');
CALL postgres_execute('pg', 'CREATE INDEX place_brand_domain_idx ON place (brand_domain) WHERE (brand_domain IS NOT NULL AND deleted_at IS NULL)');

CALL postgres_execute('pg', 'ANALYZE place');

DETACH pg;
