/**
 * SRI-352 — SF DPH restaurant inspections importer.
 * Source: https://data.sfgov.org/resource/pyih-qa8i.json (Socrata, no key)
 * ~6.2k distinct restaurants. Lat/lon present on ~50%, addr/zip on all.
 */
import { sql } from "drizzle-orm";

import { db, merchantLocation, pool } from "./_lib/db";
import { cleanPhone, titleCase } from "./_lib/normalize";

const BASE = "https://data.sfgov.org/resource/pyih-qa8i.json";
const PAGE = 5000;
const SOURCE = "sf_dph";

interface Row {
  business_id: string;
  business_name?: string;
  business_address?: string;
  business_city?: string;
  business_state?: string;
  business_postal_code?: string;
  business_phone_number?: string;
  business_latitude?: string;
  business_longitude?: string;
}

async function fetchPage(offset: number): Promise<Row[]> {
  const params = new URLSearchParams({
    $group:
      "business_id,business_name,business_address,business_city,business_state,business_postal_code,business_phone_number,business_latitude,business_longitude",
    $limit: String(PAGE),
    $offset: String(offset),
    $order: "business_id",
    $select:
      "business_id,business_name,business_address,business_city,business_state,business_postal_code,business_phone_number,business_latitude,business_longitude",
  });
  const url = `${BASE}?${params.toString()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    const wait = 2000 * (attempt + 1);
    console.warn(`[sf] ${res.status} on offset=${offset}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`[sf] giving up at offset=${offset}`);
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
      .filter((r) => r.business_id && r.business_name && r.business_address)
      .map((r) => {
        const lat = r.business_latitude ? Number(r.business_latitude) : null;
        const lon = r.business_longitude ? Number(r.business_longitude) : null;
        return {
          address: titleCase(r.business_address!.trim()),
          city: r.business_city ? titleCase(r.business_city) : "San Francisco",
          lat: lat !== null && Number.isFinite(lat) && lat !== 0 ? lat : null,
          lon: lon !== null && Number.isFinite(lon) && lon !== 0 ? lon : null,
          phone: cleanPhone(r.business_phone_number),
          postalCode: r.business_postal_code ?? null,
          rawName: titleCase(r.business_name!.trim()),
          region: (r.business_state ?? "CA").toUpperCase(),
          source: SOURCE,
          sourceId: String(r.business_id),
        };
      });

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
            lat: sql`excluded.lat`,
            lon: sql`excluded.lon`,
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
      `[sf] offset=${offset} got=${rows.length} upserted=${values.length} total=${totalUpserted} elapsed=${elapsed}s`,
    );

    if (rows.length < PAGE) {
      break;
    }
  }

  console.log(`[sf] DONE seen=${totalSeen} upserted=${totalUpserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[sf] FAILED:", error);
  process.exit(1);
});
