/**
 * SRI-352 — Phase 3 rollup: cluster locations into merchant brands.
 * Category mapped per source (ny_retail_food → groceries, rest → restaurants).
 */
import { sql } from "drizzle-orm";

import { db, pool } from "./_lib/db";

async function main() {
  const start = Date.now();

  console.log("[rollup] inserting merchants from name_normalized clusters...");
  const insertRes = await db.execute(sql`
    INSERT INTO merchant (canonical_name, name_normalized, category_system_key)
    SELECT
      mode() WITHIN GROUP (ORDER BY raw_name) AS canonical_name,
      btrim(regexp_replace(lower(raw_name), '[^a-z0-9 ]+', ' ', 'g')) AS name_normalized,
      CASE
        WHEN bool_or(source = 'ny_retail_food') AND bool_and(source = 'ny_retail_food')
          THEN 'groceries'
        ELSE 'restaurants'
      END AS category_system_key
    FROM merchant_location
    WHERE merchant_id IS NULL
      AND length(btrim(regexp_replace(lower(raw_name), '[^a-z0-9 ]+', ' ', 'g'))) > 0
    GROUP BY name_normalized
    ON CONFLICT (name_normalized) WHERE deleted_at IS NULL DO NOTHING
    RETURNING id;
  `);
  console.log(`[rollup] inserted_merchants=${insertRes.rowCount ?? 0}`);

  console.log("[rollup] backfilling merchant_id on locations...");
  const updRes = await db.execute(sql`
    UPDATE merchant_location ml
       SET merchant_id = m.id,
           updated_at  = now()
      FROM merchant m
     WHERE ml.merchant_id IS NULL
       AND m.name_normalized = btrim(regexp_replace(lower(ml.raw_name), '[^a-z0-9 ]+', ' ', 'g'));
  `);
  console.log(`[rollup] backfilled_locations=${updRes.rowCount ?? 0}`);

  console.log("[rollup] recomputing location_count + is_chain...");
  const countRes = await db.execute(sql`
    WITH counts AS (
      SELECT merchant_id, COUNT(*)::int AS n
      FROM merchant_location
      WHERE merchant_id IS NOT NULL
      GROUP BY merchant_id
    )
    UPDATE merchant m
       SET location_count = counts.n,
           is_chain       = counts.n >= 3,
           updated_at     = now()
      FROM counts
     WHERE m.id = counts.merchant_id;
  `);
  console.log(`[rollup] updated_merchants=${countRes.rowCount ?? 0}`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[rollup] DONE elapsed=${elapsed}s`);
  await pool.end();
}

main().catch((error) => {
  console.error("[rollup] FAILED:", error);
  process.exit(1);
});
