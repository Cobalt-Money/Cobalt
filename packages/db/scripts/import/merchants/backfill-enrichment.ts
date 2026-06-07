/**
 * SRI-352 — backfill enrichment writer for in-store Plaid txns.
 *
 * - Pre-flight skip: txns already covered by Plaid (location + website + clean name)
 * - Calls findMerchantForTransaction
 * - Per-field write policy: only fill fields where Plaid sent NULL
 * - Respects lockedFields
 * - Writes only when confidence is `exact` or `high`
 * - Dry-run by default — pass `--apply` to actually write
 *
 * Usage:
 *   bun run packages/db/scripts/import/merchants/backfill-enrichment.ts            # dry-run all users
 *   USER_PREFIX=xeKJ bun run …                                                     # one user
 *   bun run … --apply                                                              # actually write
 */
import { sql } from "drizzle-orm";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";

const APPLY = process.argv.includes("--apply");
const USER_PREFIX = process.env.USER_PREFIX ?? null;

interface PlaidTxn {
  id: string;
  user_id: string;
  name: string | null;
  merchant_name: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  lat: number | null;
  lon: number | null;
  store_number: string | null;
  payment_channel: string | null;
  website: string | null;
  date: string | null;
  locked_fields: string[] | null;
}

const WRITABLE_FIELDS = [
  "merchant_name",
  "website",
  "address",
  "city",
  "region",
  "postal_code",
  "lat",
  "lon",
  "store_number",
] as const;
type WritableField = (typeof WRITABLE_FIELDS)[number];

function isLocked(field: WritableField, locked: string[] | null): boolean {
  if (!locked) {
    return false;
  }
  const camel: Record<WritableField, string> = {
    address: "address",
    city: "city",
    lat: "lat",
    lon: "lon",
    merchant_name: "merchantName",
    postal_code: "postalCode",
    region: "region",
    store_number: "storeNumber",
    website: "website",
  };
  return locked.includes(camel[field]) || locked.includes(field);
}

async function main() {
  const userFilter = USER_PREFIX ? sql`AND user_id LIKE ${USER_PREFIX + "%"}` : sql``;
  const txns = await db.execute<PlaidTxn>(sql`
    SELECT id, user_id, name, merchant_name, address, city, region, postal_code,
           lat, lon, store_number, payment_channel, website, date::text AS date, locked_fields
    FROM transaction
    WHERE source = 'plaid'
      AND payment_channel = 'in store'
      ${userFilter}
  `);

  console.log(`[backfill] processing ${txns.rows.length} in-store txns (apply=${APPLY})`);
  const start = Date.now();

  let preflightSkipped = 0;
  let noMatch = 0;
  let lowConfidence = 0;
  let nothingToWrite = 0;
  let wouldUpdate = 0;
  let actuallyUpdated = 0;
  const fieldStats: Record<WritableField, number> = {
    address: 0,
    city: 0,
    lat: 0,
    lon: 0,
    merchant_name: 0,
    postal_code: 0,
    region: 0,
    store_number: 0,
    website: 0,
  };

  // Process txns in concurrent batches. Each txn does ~4 round-trips to the DB
  // (trgm, signal-hits, optional tier query, write). PlanetScale us-east-4 from
  // a laptop = ~80 ms RTT, so sequential = ~35 min for 6.5k txns. Batching to
  // 50 concurrent in-flight queries pegs throughput at PG's actual capacity.
  const BATCH = Number(process.env.BACKFILL_CONCURRENCY ?? 50);
  for (let i = 0; i < txns.rows.length; i += BATCH) {
    const slice = txns.rows.slice(i, i + BATCH);
    if (i > 0 && i % 500 === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[backfill] ${i}/${txns.rows.length} elapsed=${elapsed}s`);
    }
    await Promise.all(
      slice.map(async (t) => {
        await processOne(t);
      }),
    );
  }

  async function processOne(t: PlaidTxn) {
    const sourceName = t.merchant_name ?? t.name;
    if (!sourceName) {
      noMatch++;
      return;
    }

    // Pre-flight: skip if Plaid already gave us a full location pin. Website /
    // subtype gaps are nice-to-have but not worth running pipeline for if the
    // map experience is fully resolved.
    const locationFull =
      t.address !== null &&
      t.city !== null &&
      t.region !== null &&
      t.lat !== null &&
      t.lon !== null;
    if (locationFull) {
      preflightSkipped++;
      return;
    }

    const gaps: WritableField[] = WRITABLE_FIELDS.filter((f) => {
      if (isLocked(f, t.locked_fields)) {
        return false;
      }
      const v = (t as Record<string, unknown>)[f];
      return v === null || v === undefined;
    }) as WritableField[];

    if (gaps.length === 0) {
      preflightSkipped++;
      return;
    }

    const res = await findMerchantForTransaction(
      {
        address: t.address,
        city: t.city,
        date: t.date,
        lat: t.lat,
        lon: t.lon,
        name: sourceName,
        paymentChannel: "in store",
        postalCode: t.postal_code,
        region: t.region,
        storeNumber: t.store_number,
      },
      { userId: t.user_id },
    );

    if (!res) {
      noMatch++;
      return;
    }
    if (res.confidence !== "exact" && res.confidence !== "high") {
      lowConfidence++;
      return;
    }

    // Build the SET clause — only for gap fields where match has a value.
    const setSql: ReturnType<typeof sql>[] = [];
    const wroteFields: WritableField[] = [];
    const tryWrite = (field: WritableField, value: unknown) => {
      if (!gaps.includes(field)) {
        return;
      }
      if (value === null || value === undefined || value === "") {
        return;
      }
      setSql.push(sql.raw(`"${field}" = `).append(sql`${value}`));
      wroteFields.push(field);
      fieldStats[field]++;
    };

    // Brand fields — write only if cleaner than what Plaid sent
    if (gaps.includes("merchant_name")) {
      tryWrite("merchant_name", res.merchant.canonicalName);
    } else if (
      t.merchant_name &&
      t.merchant_name !== res.merchant.canonicalName &&
      res.merchant.canonicalName.length >= t.merchant_name.length &&
      !isLocked("merchant_name", t.locked_fields)
    ) {
      // Promote to cleaner name when Plaid's is uppercase/abbreviated and match's is canonical.
      // Heuristic: only overwrite when raw is fully uppercase OR is a strict substring.
      const rawUp = t.merchant_name === t.merchant_name.toUpperCase();
      const isSubstring = res.merchant.canonicalName
        .toLowerCase()
        .includes(t.merchant_name.toLowerCase());
      if (rawUp || isSubstring) {
        setSql.push(sql.raw(`"merchant_name" = `).append(sql`${res.merchant.canonicalName}`));
        wroteFields.push("merchant_name");
        fieldStats.merchant_name++;
      }
    }
    tryWrite("website", res.merchant.domain);
    if (res.location) {
      tryWrite("address", res.location.address);
      tryWrite("city", res.location.city);
      tryWrite("region", res.location.region);
      tryWrite("postal_code", res.location.postalCode);
      tryWrite("lat", res.location.lat);
      tryWrite("lon", res.location.lon);
      tryWrite("store_number", res.location.storeNumber);
    }

    if (setSql.length === 0) {
      nothingToWrite++;
      return;
    }
    wouldUpdate++;

    if (APPLY) {
      const setClause = sql.join(setSql, sql`, `);
      await db.execute(
        sql`UPDATE transaction SET ${setClause}, updated_at = now() WHERE id = ${t.id}`,
      );
      actuallyUpdated++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("");
  console.log(`[backfill] DONE in ${elapsed}s — mode: ${APPLY ? "APPLIED" : "DRY-RUN"}`);
  console.log("");
  console.log("=== outcomes ===");
  console.log(`  preflight_skipped (Plaid already had it):  ${preflightSkipped}`);
  console.log(`  no_match (matcher returned null):          ${noMatch}`);
  console.log(`  low_confidence (capped under high):        ${lowConfidence}`);
  console.log(`  nothing_to_write (match had no new data):  ${nothingToWrite}`);
  console.log(
    `  would_update / updated:                    ${wouldUpdate}${APPLY ? ` (applied=${actuallyUpdated})` : ""}`,
  );
  console.log("");
  console.log("=== fields written per pass ===");
  for (const f of WRITABLE_FIELDS) {
    if (fieldStats[f] > 0) {
      console.log(`  ${f.padEnd(15)} ${fieldStats[f]}`);
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error("[backfill] FAILED:", error);
  process.exit(1);
});
