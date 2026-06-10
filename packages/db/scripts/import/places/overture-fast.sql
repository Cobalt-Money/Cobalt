-- SRI-354 — Overture import fast path.
--
-- Used when `/tmp/overture_food_retail.parquet` exists from a prior failed run
-- (overture.sql writes it after staging, before INSERT). Skips the 15-min S3
-- scan entirely — flat columns are already extracted, just INSERT into PG.
--
-- Wrapper picks this when the cache file exists, otherwise falls back to the
-- full overture.sql path.

INSTALL postgres; LOAD postgres;

ATTACH '__PG_URL__' AS pg (TYPE postgres);

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
FROM read_parquet('/tmp/overture_food_retail.parquet')
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
  is_active               = true,
  deleted_at              = NULL;

DETACH pg;
