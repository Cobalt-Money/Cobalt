-- GIST index on ll_to_earth(lat, lon) for the byGeo matcher path.
-- Following the documented `earthdistance` pattern (postgresql.org/docs/18/earthdistance.html):
-- the matcher rewrites its radius filter to use `earth_box(...) @> ll_to_earth(...)`
-- which is index-eligible via this GIST entry. Without the index the seq scan
-- against ~1.5M place rows ran at p50 33s / p99 61s per call, single-handedly
-- consuming ~69% of all PlanetScale DB time and triggering pooler-side
-- connection drops that cascaded into Zero, sync, and enrichment crashes.
--
-- Partial index matches the matcher's existing predicate (`lat IS NOT NULL AND
-- lon IS NOT NULL AND deleted_at IS NULL`) so it indexes only the rows the
-- matcher actually queries.
CREATE INDEX IF NOT EXISTS "place_earth_idx"
  ON "enrichment"."place"
  USING gist (ll_to_earth(lat, lon))
  WHERE lat IS NOT NULL AND lon IS NOT NULL AND deleted_at IS NULL;
