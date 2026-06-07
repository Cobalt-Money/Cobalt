/**
 * Run findMerchantForTransaction against the real Plaid txns in the local DB.
 *
 * Strips user-identifying fields (user_id, account_id, amount, date) before
 * passing to the match fn — only the Plaid location/name fields used by
 * the matcher are retained. Output is JSONL for review + summary stats.
 *
 * Run: bun run packages/db/scripts/import/merchants/test-match-real-txns.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";
import { sql } from "drizzle-orm";

const SAMPLE_SIZE = Number(process.env.SAMPLE ?? 200);

interface PlaidTxn {
  id: string;
  user_id: string;
  merchant_name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  lat: number | null;
  lon: number | null;
  store_number: string | null;
  payment_channel: string | null;
}

async function main() {
  console.log(`[test-match] sampling up to ${SAMPLE_SIZE} in-store Plaid txns…`);

  const txns = await db.execute<PlaidTxn>(sql`
    SELECT id, user_id, merchant_name, address, city, region, postal_code, lat, lon, store_number, payment_channel
    FROM transaction
    WHERE source = 'plaid'
      AND payment_channel = 'in store'
      AND merchant_name IS NOT NULL
    ORDER BY random()
    LIMIT ${SAMPLE_SIZE}
  `);

  console.log(`[test-match] sampled ${txns.rows.length} txns. running match fn…`);

  const start = Date.now();
  const results: Record<string, unknown>[] = [];
  const reasonCounts: Record<string, number> = {};
  const confCounts: Record<string, number> = { exact: 0, high: 0, low: 0, med: 0, null: 0 };
  let withLocation = 0;
  let withDomain = 0;

  for (const t of txns.rows) {
    const input = {
      address: t.address,
      city: t.city,
      lat: t.lat,
      lon: t.lon,
      name: t.merchant_name!,
      paymentChannel: "in store" as const,
      postalCode: t.postal_code,
      region: t.region,
      storeNumber: t.store_number,
    };
    // Anonymize: opaque hash of user_id only used to enable per-user history lookup,
    // not stored in output. We re-use the real user_id for accurate brand-history math.
    const res = await findMerchantForTransaction(input, { userId: t.user_id });

    const reason = res?.reason ?? "null";
    const conf = res?.confidence ?? "null";
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    confCounts[conf] = (confCounts[conf] ?? 0) + 1;
    if (res?.location) {
      withLocation++;
    }
    if (res?.merchant?.domain) {
      withDomain++;
    }

    results.push({
      input: {
        address: input.address,
        city: input.city,
        lat: input.lat,
        lon: input.lon,
        name: input.name,
        postalCode: input.postalCode,
        region: input.region,
        storeNumber: input.storeNumber,
      },
      output: res
        ? {
            confidence: res.confidence,
            domain: res.merchant.domain,
            isChain: res.merchant.isChain,
            locationAddress: res.location?.address ?? null,
            locationCity: res.location?.city ?? null,
            locationCount: res.merchant.locationCount,
            locationLat: res.location?.lat ?? null,
            locationLon: res.location?.lon ?? null,
            locationRegion: res.location?.region ?? null,
            merchantName: res.merchant.canonicalName,
            reason: res.reason,
            subtype: res.merchant.subtype,
          }
        : null,
    });
  }

  const elapsedMs = Date.now() - start;
  const outPath = resolve(process.cwd(), "logs/test-match-results.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log("");
  console.log(
    `[test-match] DONE — ${results.length} txns in ${elapsedMs}ms (${(elapsedMs / results.length).toFixed(1)}ms each)`,
  );
  console.log(`[test-match] output → ${outPath}`);
  console.log("");
  console.log("=== confidence distribution ===");
  for (const [k, v] of Object.entries(confCounts).toSorted((a, b) => b[1] - a[1])) {
    if (v > 0) {
      console.log(`  ${k.padEnd(10)} ${v} (${((v / results.length) * 100).toFixed(1)}%)`);
    }
  }
  console.log("");
  console.log("=== reason distribution ===");
  for (const [k, v] of Object.entries(reasonCounts).toSorted((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v} (${((v / results.length) * 100).toFixed(1)}%)`);
  }
  console.log("");
  console.log(
    `Got brand match: ${results.length - (reasonCounts["null"] ?? 0)} / ${results.length}`,
  );
  console.log(`Got location pinned: ${withLocation} / ${results.length}`);
  console.log(`Got verified domain: ${withDomain} / ${results.length}`);

  await pool.end();
}

main().catch((error) => {
  console.error("[test-match] FAILED:", error);
  process.exit(1);
});
