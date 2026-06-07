/**
 * Pull a sample of proposed enrichments across all users.
 * Shows: original Plaid fields → what backfill would write.
 */
import { sql } from "drizzle-orm";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";

const SAMPLE = Number(process.env.SAMPLE ?? 30);

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
  website: string | null;
  date: string | null;
}

async function main() {
  // Random sample of in-store txns that have ANY field missing (gappable)
  const txns = await db.execute<PlaidTxn>(sql`
    SELECT id, user_id, name, merchant_name, address, city, region, postal_code,
           lat, lon, store_number, website, date::text AS date
    FROM transaction
    WHERE source='plaid' AND payment_channel='in store'
      AND (merchant_name IS NOT NULL OR name IS NOT NULL)
      AND (lat IS NULL OR website IS NULL OR address IS NULL)
    ORDER BY random()
    LIMIT ${SAMPLE * 5}
  `);

  let shown = 0;
  for (const t of txns.rows) {
    if (shown >= SAMPLE) {
      break;
    }
    const sourceName = t.merchant_name ?? t.name;
    if (!sourceName) {
      continue;
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
    if (!res || (res.confidence !== "exact" && res.confidence !== "high")) {
      continue;
    }

    // Build the actual proposed writes (gap-only)
    const writes: Record<string, string> = {};
    const tryW = (field: string, plaidVal: unknown, newVal: unknown) => {
      if (
        (plaidVal === null || plaidVal === undefined || plaidVal === "") &&
        newVal !== null &&
        newVal !== undefined &&
        newVal !== ""
      ) {
        writes[field] = String(newVal);
      }
    };
    // brand
    if (t.merchant_name === null) {
      writes["merchant_name"] = res.merchant.canonicalName;
    } else if (
      t.merchant_name === t.merchant_name.toUpperCase() ||
      res.merchant.canonicalName.toLowerCase().includes(t.merchant_name.toLowerCase())
    ) {
      if (t.merchant_name !== res.merchant.canonicalName) {
        writes["merchant_name"] = `${t.merchant_name} → ${res.merchant.canonicalName}`;
      }
    }
    tryW("website", t.website, res.merchant.domain);
    if (res.location) {
      tryW("address", t.address, res.location.address);
      tryW("city", t.city, res.location.city);
      tryW("region", t.region, res.location.region);
      tryW("postal_code", t.postal_code, res.location.postalCode);
      tryW("lat", t.lat, res.location.lat);
      tryW("lon", t.lon, res.location.lon);
      tryW("store_number", t.store_number, res.location.storeNumber);
    }
    if (Object.keys(writes).length === 0) {
      continue;
    }

    shown++;
    const plaidLoc =
      [t.address, t.city, t.region].filter(Boolean).join(", ") || "(no Plaid location)";
    console.log(`\n[${shown}] PLAID: "${t.merchant_name ?? t.name}" — ${plaidLoc}`);
    console.log(`     BRAND: ${res.merchant.canonicalName} (${res.reason}, ${res.confidence})`);
    if (res.location) {
      console.log(
        `     LOC:   ${res.location.address}, ${res.location.city}, ${res.location.region}`,
      );
    }
    console.log(`     WRITES:`);
    for (const [k, v] of Object.entries(writes)) {
      console.log(`       ${k.padEnd(15)} ${v}`);
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
