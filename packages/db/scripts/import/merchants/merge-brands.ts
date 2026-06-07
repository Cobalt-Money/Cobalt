/**
 * SRI-352 — merge rollup-split brand rows.
 *
 * For chains where multiple merchant rows clearly describe the same brand
 * (high trigram similarity on name_normalized), pick the winner (most
 * locations, prefer google_places domain), repoint losers' locations,
 * delete losers. Recompute location_count + is_chain.
 */
import { sql } from "drizzle-orm";

import { db, pool } from "./_lib/db";

async function main() {
  const start = Date.now();

  console.log("[merge] finding cluster winners (max-location per cluster)...");
  const merges = await db.execute<{
    keep_id: string;
    drop_id: string;
    keep_name: string;
    drop_name: string;
    keep_count: number;
    drop_count: number;
  }>(sql`
    WITH pairs AS (
      SELECT a.id AS a_id, b.id AS b_id,
             a.canonical_name AS a_name, b.canonical_name AS b_name,
             a.location_count AS a_count, b.location_count AS b_count,
             a.domain AS a_domain, b.domain AS b_domain,
             a.domain_source AS a_src, b.domain_source AS b_src
      FROM merchant a
      JOIN merchant b
        ON a.id < b.id
       AND a.is_chain = true
       AND b.is_chain = true
       AND a.category_system_key = b.category_system_key
       AND a.deleted_at IS NULL
       AND b.deleted_at IS NULL
       AND similarity(a.name_normalized, b.name_normalized) > 0.65
    ),
    decided AS (
      SELECT
        CASE
          WHEN (a_src = 'google_places' AND b_src IS DISTINCT FROM 'google_places') THEN a_id
          WHEN (b_src = 'google_places' AND a_src IS DISTINCT FROM 'google_places') THEN b_id
          WHEN a_count >= b_count THEN a_id
          ELSE b_id
        END AS keep_id,
        CASE
          WHEN (a_src = 'google_places' AND b_src IS DISTINCT FROM 'google_places') THEN b_id
          WHEN (b_src = 'google_places' AND a_src IS DISTINCT FROM 'google_places') THEN a_id
          WHEN a_count >= b_count THEN b_id
          ELSE a_id
        END AS drop_id,
        a_id, b_id, a_name, b_name, a_count, b_count
      FROM pairs
    )
    SELECT
      d.keep_id,
      d.drop_id,
      CASE WHEN d.keep_id = d.a_id THEN d.a_name ELSE d.b_name END AS keep_name,
      CASE WHEN d.drop_id = d.a_id THEN d.a_name ELSE d.b_name END AS drop_name,
      CASE WHEN d.keep_id = d.a_id THEN d.a_count ELSE d.b_count END AS keep_count,
      CASE WHEN d.drop_id = d.a_id THEN d.a_count ELSE d.b_count END AS drop_count
    FROM decided d
    ORDER BY drop_count ASC;
  `);

  console.log(`[merge] candidate merges=${merges.rows.length}`);
  if (merges.rows.length === 0) {
    console.log("[merge] nothing to do");
    await pool.end();
    return;
  }

  // log + apply transitively (the drop in pass 1 might be the keep in pass 2;
  // resolve to ultimate keeper per drop via a quick map)
  const ultimate = new Map<string, string>();
  function resolve(id: string): string {
    let cur = id;
    while (ultimate.has(cur)) {
      cur = ultimate.get(cur)!;
    }
    return cur;
  }
  for (const r of merges.rows) {
    const keep = resolve(r.keep_id);
    const drop = resolve(r.drop_id);
    if (keep === drop) {
      continue;
    }
    ultimate.set(drop, keep);
    console.log(`[merge] "${r.drop_name}" (${r.drop_count}) -> "${r.keep_name}" (${r.keep_count})`);
  }

  console.log(`[merge] applying ${ultimate.size} merges...`);
  let dropCount = 0;
  // Wrap all (UPDATE location, DELETE merchant) pairs in one tx so a crash
  // mid-loop never leaves merchant_location rows pointing at a deleted brand
  // (FK CASCADE would otherwise wipe them) or strands a kept brand without
  // its inherited locations.
  await db.transaction(async (tx) => {
    for (const [dropId, keepId] of ultimate.entries()) {
      await tx.execute(sql`
        UPDATE merchant_location SET merchant_id = ${keepId}, updated_at = now()
         WHERE merchant_id = ${dropId};
      `);
      await tx.execute(sql`DELETE FROM merchant WHERE id = ${dropId};`);
      dropCount++;
    }
  });
  console.log(`[merge] deleted_merchants=${dropCount}`);

  console.log("[merge] recomputing location_count + is_chain...");
  await db.execute(sql`
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

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[merge] DONE elapsed=${elapsed}s`);
  await pool.end();
}

main().catch((error) => {
  console.error("[merge] FAILED:", error);
  process.exit(1);
});
