/**
 * Dry-run enrichment preview against real in-store Plaid txns in local PG.
 *
 * Reads every in-store plaid txn, runs match fn, writes a TSV with original
 * Plaid fields + what we'd enrich. No DB writes. Open in Numbers/Excel.
 *
 * Run: bun run packages/db/scripts/import/merchants/preview-enrichment.ts
 *   ENV: LIMIT=N (default: all in-store)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { sql } from "drizzle-orm";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";

const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null;
const USER_PREFIX = process.env.USER_PREFIX ?? null;

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
  website: string | null;
  date: string | null;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) {
    return "";
  }
  const s = String(v);
  return s.replaceAll(/[\t\r\n]/g, " ");
}

async function main() {
  const userFilter = USER_PREFIX ? sql`AND user_id LIKE ${USER_PREFIX + "%"}` : sql``;
  const txns = await db.execute<PlaidTxn>(sql`
    SELECT id, user_id, merchant_name, address, city, region, postal_code, lat, lon, store_number, payment_channel, website, date
    FROM transaction
    WHERE source = 'plaid'
      AND payment_channel = 'in store'
      AND merchant_name IS NOT NULL
      ${userFilter}
    ORDER BY merchant_name, date DESC
    ${LIMIT ? sql`LIMIT ${LIMIT}` : sql``}
  `);

  console.log(`[preview] enriching ${txns.rows.length} in-store txns…`);

  const headers = [
    "plaid_name",
    "plaid_addr",
    "plaid_city",
    "plaid_region",
    "plaid_zip",
    "plaid_lat",
    "plaid_lon",
    "plaid_store_number",
    "→",
    "match_name",
    "match_domain",
    "match_subtype",
    "match_addr",
    "match_city",
    "match_region",
    "match_zip",
    "match_lat",
    "match_lon",
    "is_chain",
    "confidence",
    "reason",
  ];

  const rows: string[] = [headers.join("\t")];
  let matched = 0;
  let locPinned = 0;
  let withDomain = 0;
  const reasonCounts: Record<string, number> = {};

  const start = Date.now();
  for (const t of txns.rows) {
    const res = await findMerchantForTransaction(
      {
        address: t.address,
        city: t.city,
        date: t.date,
        lat: t.lat,
        lon: t.lon,
        name: t.merchant_name!,
        paymentChannel: "in store",
        postalCode: t.postal_code,
        region: t.region,
        storeNumber: t.store_number,
      },
      { userId: t.user_id },
    );
    if (res) {
      matched++;
    }
    if (res?.location) {
      locPinned++;
    }
    if (res?.merchant?.domain) {
      withDomain++;
    }
    const reason = res?.reason ?? "null";
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;

    rows.push(
      [
        esc(t.merchant_name),
        esc(t.address),
        esc(t.city),
        esc(t.region),
        esc(t.postal_code),
        esc(t.lat),
        esc(t.lon),
        esc(t.store_number),
        "→",
        esc(res?.merchant.canonicalName),
        esc(res?.merchant.domain),
        esc(res?.merchant.subtype),
        esc(res?.location?.address),
        esc(res?.location?.city),
        esc(res?.location?.region),
        esc(res?.location?.postalCode),
        esc(res?.location?.lat),
        esc(res?.location?.lon),
        esc(res?.merchant.isChain),
        esc(res?.confidence ?? "null"),
        esc(reason),
      ].join("\t"),
    );
  }

  const outPath = resolve(process.cwd(), "logs/enrichment-preview.tsv");
  writeFileSync(outPath, rows.join("\n"));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log("");
  console.log(`[preview] DONE — ${txns.rows.length} rows in ${elapsed}s`);
  console.log(`[preview] output → ${outPath}`);
  console.log("");
  console.log("=== summary ===");
  console.log(
    `  brand matched:      ${matched} (${((matched / txns.rows.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  location pinned:    ${locPinned} (${((locPinned / txns.rows.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  with verified dom:  ${withDomain} (${((withDomain / txns.rows.length) * 100).toFixed(1)}%)`,
  );
  console.log("");
  console.log("=== reason distribution ===");
  for (const [k, v] of Object.entries(reasonCounts).toSorted((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error("[preview] FAILED:", error);
  process.exit(1);
});
