/**
 * Trace findMerchantForTransaction on a single Plaid txn.
 *
 * Usage:
 *   bun run packages/db/scripts/import/merchants/trace-match.ts <TXN_ID>
 *   bun run packages/db/scripts/import/merchants/trace-match.ts --name "MAYA TAQUERIA" --user xeKJ
 *   add --apply to actually write enrichment back to the txn row
 */
import { sql } from "drizzle-orm";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const nameIdx = args.indexOf("--name");
const userIdx = args.indexOf("--user");
const namePrefix = nameIdx !== -1 ? args[nameIdx + 1] : null;
const userPrefix = userIdx !== -1 ? args[userIdx + 1] : null;
const txnId = args.find(
  (a) =>
    a !== "--apply" &&
    a !== "--name" &&
    a !== "--user" &&
    !a.startsWith("--") &&
    a !== namePrefix &&
    a !== userPrefix,
);

async function main() {
  let txn:
    | {
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
    | undefined;

  if (txnId) {
    const res = await db.execute<NonNullable<typeof txn>>(sql`
      SELECT id, user_id, merchant_name, address, city, region, postal_code, lat, lon, store_number, payment_channel
      FROM transaction WHERE id = ${txnId}
    `);
    txn = res.rows[0];
  } else if (namePrefix) {
    const userFilter = userPrefix ? sql`AND user_id LIKE ${userPrefix + "%"}` : sql``;
    const res = await db.execute<NonNullable<typeof txn>>(sql`
      SELECT id, user_id, merchant_name, address, city, region, postal_code, lat, lon, store_number, payment_channel
      FROM transaction
      WHERE source = 'plaid'
        AND merchant_name ILIKE ${namePrefix + "%"}
        ${userFilter}
      LIMIT 1
    `);
    txn = res.rows[0];
  } else {
    console.error("usage: trace-match.ts <TXN_ID> | --name <prefix> [--user <prefix>] [--apply]");
    process.exit(2);
  }

  if (!txn) {
    console.error("no matching transaction found");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("INPUT TRANSACTION");
  console.log("=".repeat(60));
  console.log(JSON.stringify(txn, null, 2));
  console.log("");
  console.log("=".repeat(60));
  console.log("MATCH FN TRACE");
  console.log("=".repeat(60));

  const trace = (step: string, data?: Record<string, unknown>) => {
    if (data) {
      console.log(`[${step}]`);
      for (const [k, v] of Object.entries(data)) {
        const out = typeof v === "string" ? v : JSON.stringify(v);
        console.log(`  ${k} = ${out}`);
      }
    } else {
      console.log(`[${step}]`);
    }
  };

  const res = await findMerchantForTransaction(
    {
      address: txn.address,
      city: txn.city,
      lat: txn.lat,
      lon: txn.lon,
      name: txn.merchant_name!,
      paymentChannel: (txn.payment_channel as "in store" | "online" | "other" | null) ?? null,
      postalCode: txn.postal_code,
      region: txn.region,
      storeNumber: txn.store_number,
    },
    { userId: txn.user_id },
    trace,
  );

  console.log("");
  console.log("=".repeat(60));
  console.log("RESULT");
  console.log("=".repeat(60));
  if (!res) {
    console.log("NO MATCH");
  } else {
    console.log(`merchant:    ${res.merchant.canonicalName} (id=${res.merchant.id})`);
    console.log(`  domain:    ${res.merchant.domain ?? "(none)"}`);
    console.log(`  subtype:   ${res.merchant.subtype ?? "(none)"}`);
    console.log(`  is_chain:  ${res.merchant.isChain}`);
    console.log(`  locations: ${res.merchant.locationCount}`);
    console.log(
      `location:    ${res.location ? `${res.location.address}, ${res.location.city}, ${res.location.region}` : "(brand only)"}`,
    );
    if (res.location) {
      console.log(`  lat/lon:   ${res.location.lat ?? "null"}, ${res.location.lon ?? "null"}`);
      console.log(`  zip:       ${res.location.postalCode ?? "null"}`);
    }
    console.log(`confidence:  ${res.confidence}`);
    console.log(`reason:      ${res.reason}`);
  }

  if (apply && res && res.confidence !== "low") {
    console.log("");
    console.log("=".repeat(60));
    console.log("APPLYING ENRICHMENT");
    console.log("=".repeat(60));
    await db.execute(sql`
      UPDATE transaction SET
        merchant_name = ${res.merchant.canonicalName},
        website = COALESCE(${res.merchant.domain ?? null}, website),
        address = COALESCE(${res.location?.address ?? null}, address),
        city = COALESCE(${res.location?.city ?? null}, city),
        region = COALESCE(${res.location?.region ?? null}, region),
        postal_code = COALESCE(${res.location?.postalCode ?? null}, postal_code),
        lat = COALESCE(${res.location?.lat ?? null}, lat),
        lon = COALESCE(${res.location?.lon ?? null}, lon),
        updated_at = now()
      WHERE id = ${txn.id}
    `);
    console.log("wrote enrichment to txn row");
  } else if (apply) {
    console.log("");
    console.log("(skipped write: result was null or low confidence)");
  }

  await pool.end();
}

main().catch((error) => {
  console.error("[trace-match] FAILED:", error);
  process.exit(1);
});
