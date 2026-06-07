/**
 * SRI-352 — LA City food facility inspections importer.
 * Source: https://data.lacity.org/resource/29fd-3paw.json (Socrata, no key)
 * ~13.5k distinct facilities. Restaurants + markets + retail food.
 */
import { sql } from "drizzle-orm";

import { db, merchantLocation, pool } from "./_lib/db";
import { titleCase } from "./_lib/normalize";

const BASE = "https://data.lacity.org/resource/29fd-3paw.json";
const PAGE = 5000;
const SOURCE = "la_city";

interface Row {
  facility_id: string;
  facility_name?: string;
  facility_address?: string;
  facility_city?: string;
  facility_state?: string;
  facility_zip?: string;
  pe_description?: string;
}

async function fetchPage(offset: number): Promise<Row[]> {
  const params = new URLSearchParams({
    $group:
      "facility_id,facility_name,facility_address,facility_city,facility_state,facility_zip,pe_description",
    $limit: String(PAGE),
    $offset: String(offset),
    $order: "facility_id",
    $select:
      "facility_id,facility_name,facility_address,facility_city,facility_state,facility_zip,pe_description",
  });
  const url = `${BASE}?${params.toString()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    const wait = 2000 * (attempt + 1);
    console.warn(`[la] ${res.status} on offset=${offset}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`[la] giving up at offset=${offset}`);
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

    const seen = new Set<string>();
    const values = rows
      .filter((r) => r.facility_id && r.facility_name && r.facility_address)
      .filter((r) => {
        if (seen.has(r.facility_id)) {
          return false;
        }
        seen.add(r.facility_id);
        return true;
      })
      .map((r) => ({
        address: titleCase(r.facility_address!.trim()),
        city: r.facility_city ? titleCase(r.facility_city) : "Los Angeles",
        lat: null,
        lon: null,
        phone: null,
        postalCode: r.facility_zip ?? null,
        rawName: titleCase(r.facility_name!.trim()),
        region: (r.facility_state ?? "CA").toUpperCase(),
        source: SOURCE,
        sourceId: String(r.facility_id),
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
      `[la] offset=${offset} got=${rows.length} upserted=${values.length} total=${totalUpserted} elapsed=${elapsed}s`,
    );

    if (rows.length < PAGE) {
      break;
    }
  }

  console.log(`[la] DONE seen=${totalSeen} upserted=${totalUpserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[la] FAILED:", error);
  process.exit(1);
});
