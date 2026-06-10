-- SRI-354 — Overture Maps Foundation → Postgres `place` bulk import.
--
-- Pulls the food + retail-food subset of Overture's `places` theme directly
-- from the public S3 GeoParquet mirror, normalizes NYC boroughs from ZIP,
-- and INSERTs into Postgres via the DuckDB `postgres` extension. No CSV
-- roundtrip, no Node wrapper around the heavy work.
--
-- Wrapper substitutes __PG_URL__ (postgresql://...) and __RELEASE__ (e.g.
-- 2026-05-20.0) before piping this file to `duckdb`.

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
INSTALL postgres; LOAD postgres;

SET s3_region = 'us-west-2';
SET memory_limit = '8GB';
SET threads = 4;

ATTACH '__PG_URL__' AS pg (TYPE postgres);

-- Stage the filtered slice locally first; cuts pg upsert path overhead
-- (1.5M rows * one INSERT each over the wire ≈ 5–10 min vs. ~25 min).
CREATE OR REPLACE TEMPORARY TABLE staged AS
SELECT
  -- Brand identity --------------------------------------------------
  regexp_replace(
    regexp_replace(
      lower(COALESCE(brand.names.primary, names.primary)),
      '[^a-z0-9]+', '_', 'g'
    ),
    '^_+|_+$', '', 'g'
  ) AS brand_key,
  COALESCE(brand.names.primary, names.primary) AS brand_name,
  regexp_replace(
    regexp_replace(
      lower(COALESCE(brand.names.primary, names.primary)),
      '\b(inc|llc|corp|co|ltd|the)\b', '', 'g'
    ),
    '[^a-z0-9 ]+', ' ', 'g'
  ) AS brand_name_normalized,
  regexp_replace(
    regexp_replace(
      lower(COALESCE(brand.names.primary, names.primary)),
      '\b(inc|llc|corp|co|ltd|the)\b', '', 'g'
    ),
    '[^a-z0-9]+', '', 'g'
  ) AS brand_name_compact,
  regexp_extract(websites[1], '^https?://(?:www\.)?([^/]+)', 1) AS brand_domain,
  -- Taxonomy --------------------------------------------------------
  COALESCE(categories.primary, 'unknown') AS category,
  NULL::text AS subtype,
  names.primary AS raw_name,
  NULL::text AS store_number,
  -- Address ---------------------------------------------------------
  COALESCE(addresses[1].freeform, '') AS address,
  CASE
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '10001' AND '10282' THEN 'Manhattan'
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '10301' AND '10314' THEN 'Staten Island'
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '10451' AND '10475' THEN 'Bronx'
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '11201' AND '11256' THEN 'Brooklyn'
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '11004' AND '11109' THEN 'Queens'
    WHEN addresses[1].region = 'NY' AND substring(addresses[1].postcode, 1, 5) BETWEEN '11351' AND '11697' THEN 'Queens'
    ELSE COALESCE(NULLIF(addresses[1].locality, ''), 'Unknown')
  END AS city,
  addresses[1].region AS region,
  substring(addresses[1].postcode, 1, 5) AS postal_code,
  COALESCE(addresses[1].country, 'US') AS country,
  ST_Y(geometry) AS lat,
  ST_X(geometry) AS lon,
  phones[1] AS phone,
  -- Provenance ------------------------------------------------------
  'overture' AS source,
  id AS source_id,
  sources[1].update_time::timestamptz AS source_updated_at
FROM read_parquet(
  's3://overturemaps-us-west-2/release/__RELEASE__/theme=places/type=place/*',
  hive_partitioning = 1
)
WHERE addresses[1].country = 'US'
  -- Non-negotiables: name + coords. Street/zip can be reverse-geocoded later.
  AND COALESCE(brand.names.primary, names.primary) IS NOT NULL
  AND geometry IS NOT NULL
  -- Coord sanity bbox: 50 states + DC + AK + HI + PR + USVI + Guam + CNMI.
  -- Catches placeholder lat/lng (e.g. Meta South-Pacific junk).
  AND (
    (ST_Y(geometry) BETWEEN -15 AND 72 AND ST_X(geometry) BETWEEN -180 AND -64)
    OR (ST_Y(geometry) BETWEEN 13 AND 21 AND ST_X(geometry) BETWEEN 144 AND 146)
  )
  AND addresses[1].region IS NOT NULL
  AND (
    categories.primary LIKE '%restaurant%'
    OR categories.primary IN (
      'cafe', 'coffee_shop', 'bar', 'pub', 'bakery', 'food_truck', 'deli',
      'butcher', 'grocery_store', 'supermarket', 'convenience_store',
      'liquor_store', 'wine_shop', 'food_court', 'ice_cream_shop',
      'donut_shop', 'juice_shop', 'tea_room', 'pizzeria'
    )
  );

-- Drop rows missing identity columns we declare NOT NULL.
DELETE FROM staged
WHERE brand_key = ''
   OR brand_name IS NULL
   OR lat IS NULL
   OR lon IS NULL
   OR region IS NULL
   OR city IS NULL;

SELECT 'staged_count' AS metric, COUNT(*) AS value FROM staged;

-- Persist staged subset locally so re-runs after INSERT failures skip the
-- 15-min S3 scan. Subsequent runs can read this file instead of S3.
COPY staged TO '/tmp/overture_food_retail.parquet' (FORMAT PARQUET, OVERWRITE_OR_IGNORE);

-- Upsert into Postgres. ON CONFLICT path means the postgres extension can't
-- use COPY — it executes per-batch INSERTs internally. Still single round-trip
-- per row from this connection's perspective.
-- DuckDB postgres extension uses COPY, which bypasses Postgres column defaults.
-- Emit explicit values for every NOT NULL column that has a default in the
-- target schema (`id`, `also_seen_in`, `is_active`, `created_at`, `updated_at`)
-- so the COPY doesn't send NULL.
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
FROM staged
ON CONFLICT (source, source_id) DO UPDATE SET
  brand_name              = EXCLUDED.brand_name,
  brand_name_normalized   = EXCLUDED.brand_name_normalized,
  brand_name_compact      = EXCLUDED.brand_name_compact,
  brand_domain            = EXCLUDED.brand_domain,
  category                = EXCLUDED.category,
  raw_name                = EXCLUDED.raw_name,
  address                 = EXCLUDED.address,
  city                    = EXCLUDED.city,
  region                  = EXCLUDED.region,
  postal_code             = EXCLUDED.postal_code,
  lat                     = EXCLUDED.lat,
  lon                     = EXCLUDED.lon,
  phone                   = EXCLUDED.phone,
  source_updated_at       = EXCLUDED.source_updated_at,
  updated_at              = now(),
  -- Reactivate on refresh — closures handled by separate audit step.
  is_active               = true,
  deleted_at              = NULL;

SELECT 'inserted_or_updated' AS metric, COUNT(*) AS value FROM staged;

DETACH pg;
