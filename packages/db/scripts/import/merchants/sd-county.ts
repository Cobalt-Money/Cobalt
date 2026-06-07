/**
 * SRI-352 — San Diego County food facility permits importer.
 * Source: https://data.sandiegocounty.gov/resource/c5ez-ufrd.json (Socrata, no key)
 * ~16.6k food facilities. Restaurant + grocery. Active permits only.
 */
import { sql } from "drizzle-orm";

import { db, merchantLocation, pool } from "./_lib/db";
import { cleanPhone, titleCase } from "./_lib/normalize";

const BASE = "https://data.sandiegocounty.gov/resource/c5ez-ufrd.json";
const PAGE = 5000;
const SOURCE = "sd_county";

interface Row {
  id: string;
  record_id?: string;
  record_name?: string;
  permit_status?: string;
  active_permit?: boolean;
  business_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  permit_owner?: string;
}

async function fetchPage(offset: number): Promise<Row[]> {
  const params = new URLSearchParams({
    $limit: String(PAGE),
    $offset: String(offset),
    $order: "record_id",
    $where: "active_permit=true AND business_type LIKE '%Food%'",
  });
  const url = `${BASE}?${params.toString()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    const wait = 2000 * (attempt + 1);
    console.warn(`[sd] ${res.status} on offset=${offset}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`[sd] giving up at offset=${offset}`);
}

async function main() {
  const start = Date.now();
  let totalSeen = 0;
  let totalUpserted = 0;

  for (let offset = 0; ; offset += PAGE) {
    const rows = await fetchPage(offset);
    if (rows.length === 0) {
      break;
    }

    const values = rows
      .filter((r) => r.record_id && r.record_name && r.address)
      .map((r) => ({
        address: titleCase(r.address!.trim()),
        city: r.city ? titleCase(r.city) : "San Diego",
        lat: null,
        lon: null,
        phone: cleanPhone(r.permit_owner),
        postalCode: r.zip ?? null,
        rawName: titleCase(r.record_name!.trim()),
        region: (r.state ?? "CA").toUpperCase(),
        source: SOURCE,
        sourceId: String(r.record_id),
      }));

    totalSeen += rows.length;

    if (values.length > 0) {
      await db
        .insert(merchantLocation)
        .values(values)
        .onConflictDoUpdate({
          set: {
            address: sql`excluded.address`,
            city: sql`excluded.city`,
            lastSeenAt: sql`now()`,
            phone: sql`excluded.phone`,
            postalCode: sql`excluded.postal_code`,
            rawName: sql`excluded.raw_name`,
            updatedAt: sql`now()`,
          },
          target: [merchantLocation.source, merchantLocation.sourceId],
        });
      totalUpserted += values.length;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `[sd] offset=${offset} got=${rows.length} upserted=${values.length} total=${totalUpserted} elapsed=${elapsed}s`,
    );

    if (rows.length < PAGE) {
      break;
    }
  }

  console.log(`[sd] DONE seen=${totalSeen} upserted=${totalUpserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[sd] FAILED:", error);
  process.exit(1);
});
