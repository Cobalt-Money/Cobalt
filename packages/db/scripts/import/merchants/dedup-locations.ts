/**
 * SRI-352 — Phase 2 dedup: collapse cross-source duplicate physical places.
 * Loops until no candidates remain.
 */
import { sql } from "drizzle-orm";

import { db, pool } from "./_lib/db";

async function main() {
  const start = Date.now();
  let totalMerged = 0;

  for (let pass = 1; pass <= 20; pass++) {
    const res = await db.execute(sql`
      WITH candidates AS (
        SELECT a.id AS keep_id, b.id AS drop_id, b.source, b.source_id
        FROM merchant_location a
        JOIN merchant_location b
          ON a.id < b.id
         AND a.region = b.region
         AND a.postal_code IS NOT DISTINCT FROM b.postal_code
         AND similarity(
               regexp_replace(lower(a.address), '[^a-z0-9]', '', 'g'),
               regexp_replace(lower(b.address), '[^a-z0-9]', '', 'g')
             ) > 0.8
         AND similarity(
               regexp_replace(lower(a.raw_name), '[^a-z0-9]', '', 'g'),
               regexp_replace(lower(b.raw_name), '[^a-z0-9]', '', 'g')
             ) > 0.6
         AND (
               (a.lat IS NULL OR b.lat IS NULL)
               OR earth_distance(ll_to_earth(a.lat, a.lon), ll_to_earth(b.lat, b.lon)) < 200
             )
        LIMIT 5000
      ),
      stamped AS (
        UPDATE merchant_location ml
           SET also_seen_in = ml.also_seen_in || jsonb_build_object('source', c.source, 'source_id', c.source_id),
               updated_at = now()
          FROM candidates c
         WHERE ml.id = c.keep_id
        RETURNING ml.id
      ),
      deleted AS (
        DELETE FROM merchant_location ml
         USING candidates c
         WHERE ml.id = c.drop_id
        RETURNING ml.id
      )
      SELECT COUNT(*)::int AS merged FROM deleted;
    `);
    const { merged } = res.rows[0] as { merged: number };
    totalMerged += merged;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[dedup] pass=${pass} merged=${merged} total=${totalMerged} elapsed=${elapsed}s`);
    if (merged === 0) {
      break;
    }
  }

  console.log(`[dedup] DONE total_merged=${totalMerged}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[dedup] FAILED:", error);
  process.exit(1);
});
