/**
 * Re-run match fn over a user's in-store txns and print what got skipped + why.
 */
import { sql } from "drizzle-orm";

import { findMerchantForTransaction } from "../../../../server-data/src/merchants/find";

import { db, pool } from "./_lib/db";

const USER_PREFIX = process.env.USER_PREFIX ?? "xeKJ";

interface PlaidTxn {
  id: string;
  user_id: string;
  name: string | null;
  merchant_name: string | null;
  city: string | null;
  region: string | null;
  date: string | null;
  lat: number | null;
  lon: number | null;
  address: string | null;
  postal_code: string | null;
  store_number: string | null;
}

async function main() {
  const txns = await db.execute<PlaidTxn>(sql`
    SELECT id, user_id, name, merchant_name, city, region, date::text AS date,
           lat, lon, address, postal_code, store_number
    FROM transaction
    WHERE source='plaid' AND payment_channel='in store' AND user_id LIKE ${USER_PREFIX + "%"}
    ORDER BY merchant_name
  `);

  const noMatch: PlaidTxn[] = [];
  const lowConf: { t: PlaidTxn; matchName: string; conf: string; reason: string }[] = [];

  for (const t of txns.rows) {
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
    if (!res) {
      noMatch.push(t);
    } else if (res.confidence !== "exact" && res.confidence !== "high") {
      lowConf.push({
        conf: res.confidence,
        matchName: res.merchant.canonicalName,
        reason: res.reason,
        t,
      });
    }
  }

  const uniqByName = (xs: PlaidTxn[]) => {
    const m = new Map<string, { t: PlaidTxn; n: number }>();
    for (const t of xs) {
      const k = `${t.merchant_name ?? t.name ?? "(none)"}|${t.city ?? ""}|${t.region ?? ""}`;
      const prev = m.get(k);
      if (prev) {
        prev.n++;
      } else {
        m.set(k, { n: 1, t });
      }
    }
    return [...m.values()].toSorted((a, b) => b.n - a.n);
  };

  console.log("=".repeat(70));
  console.log(`NO MATCH (${noMatch.length} txns, unique by name+city+region)`);
  console.log("=".repeat(70));
  for (const { t, n } of uniqByName(noMatch)) {
    const name = (t.merchant_name ?? t.name ?? "(none)").slice(0, 35).padEnd(36);
    const loc = `${t.city ?? "-"} ${t.region ?? "-"}`.padEnd(20);
    console.log(`  ×${String(n).padStart(2)}  ${name} ${loc}`);
  }

  console.log("");
  console.log("=".repeat(70));
  console.log(`LOW CONFIDENCE (${lowConf.length} txns)`);
  console.log("=".repeat(70));
  const groups = new Map<string, { rec: (typeof lowConf)[number]; n: number }>();
  for (const r of lowConf) {
    const k = `${r.t.merchant_name ?? r.t.name}|${r.matchName}`;
    const p = groups.get(k);
    if (p) {
      p.n++;
    } else {
      groups.set(k, { n: 1, rec: r });
    }
  }
  const sorted = [...groups.values()].toSorted((a, b) => b.n - a.n);
  for (const { rec, n } of sorted) {
    const name = (rec.t.merchant_name ?? rec.t.name ?? "(none)").slice(0, 28).padEnd(29);
    const match = rec.matchName.slice(0, 28).padEnd(29);
    const loc = `${rec.t.city ?? "-"} ${rec.t.region ?? "-"}`.padEnd(18);
    console.log(
      `  ×${String(n).padStart(2)}  ${name} → ${match} ${loc} [${rec.conf} ${rec.reason}]`,
    );
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
