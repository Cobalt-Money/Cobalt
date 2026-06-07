/**
 * SRI-352 — NYC DOHMH restaurant inspections importer.
 * Source: https://data.cityofnewyork.us/resource/43nn-pn8j.json (Socrata, no key)
 * Collapses inspection rows to one per CAMIS via SoQL $group.
 */
import { sql } from "drizzle-orm";

import { db, merchantLocation, pool } from "./_lib/db";
import { cleanPhone, titleCase } from "./_lib/normalize";

const BASE = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const PAGE = 5000;
const SOURCE = "nyc_dohmh";

interface Row {
  camis: string;
  dba?: string;
  boro?: string;
  building?: string;
  street?: string;
  zipcode?: string;
  phone?: string;
  cuisine_description?: string;
  latitude?: string;
  longitude?: string;
}

async function fetchPage(offset: number): Promise<Row[]> {
  const params = new URLSearchParams({
    $group: "camis,dba,boro,building,street,zipcode,phone,cuisine_description,latitude,longitude",
    $limit: String(PAGE),
    $offset: String(offset),
    $order: "camis,building,street",
    $select: "camis,dba,boro,building,street,zipcode,phone,cuisine_description,latitude,longitude",
    $where: "latitude > '0' AND dba IS NOT NULL AND building IS NOT NULL AND street IS NOT NULL",
  });
  const url = `${BASE}?${params.toString()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    const wait = 2000 * (attempt + 1);
    console.warn(`[nyc] ${res.status} on offset=${offset}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`[nyc] giving up at offset=${offset}`);
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
      .filter((r) => r.dba && r.building && r.street && r.latitude && r.longitude)
      .map((r) => {
        const lat = Number(r.latitude);
        const lon = Number(r.longitude);
        const addr = `${r.building?.trim() ?? ""} ${r.street?.trim() ?? ""}`.trim();
        return {
          address: titleCase(addr),
          city: r.boro ? titleCase(r.boro) : "New York",
          lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
          lon: Number.isFinite(lon) && lon !== 0 ? lon : null,
          phone: cleanPhone(r.phone),
          postalCode: r.zipcode ?? null,
          rawName: titleCase(r.dba!.trim()),
          region: "NY",
          source: SOURCE,
          sourceId: String(r.camis),
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
      `[nyc] offset=${offset} got=${rows.length} upserted=${values.length} total=${totalUpserted} elapsed=${elapsed}s`,
    );

    if (rows.length < PAGE) {
      break;
    }
  }

  console.log(`[nyc] DONE seen=${totalSeen} upserted=${totalUpserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[nyc] FAILED:", error);
  process.exit(1);
});
