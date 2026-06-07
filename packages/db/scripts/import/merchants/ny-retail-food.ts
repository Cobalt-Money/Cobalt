/**
 * SRI-352 — NY State Retail Food Stores importer.
 * Source: https://data.ny.gov/resource/9a8c-vfzj.json (Socrata, no key)
 * Groceries / convenience / supermarkets statewide.
 */
import { sql } from "drizzle-orm";

import { db, merchantLocation, pool } from "./_lib/db";
import { titleCase } from "./_lib/normalize";

const BASE = "https://data.ny.gov/resource/9a8c-vfzj.json";
const PAGE = 5000;
const SOURCE = "ny_retail_food";

interface Row {
  license_number?: string;
  operation_type?: string;
  estab_type?: string;
  entity_name?: string;
  dba_name?: string;
  street_number?: string;
  street_name?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  georeference?: { type: "Point"; coordinates: [number, number] };
}

async function fetchPage(offset: number): Promise<Row[]> {
  const params = new URLSearchParams({
    $limit: String(PAGE),
    $offset: String(offset),
    $order: "license_number",
  });
  const url = `${BASE}?${params.toString()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      return res.json();
    }
    const wait = 2000 * (attempt + 1);
    console.warn(`[ny-retail] ${res.status} on offset=${offset}, retry in ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`[ny-retail] giving up at offset=${offset}`);
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
      .filter((r) => r.license_number && (r.dba_name ?? r.entity_name) && r.street_name)
      .map((r) => {
        const name = r.dba_name ?? r.entity_name ?? "";
        const addrParts = [r.street_number, r.street_name, r.address_line_2].filter(Boolean);
        const lon = r.georeference?.coordinates?.[0] ?? null;
        const lat = r.georeference?.coordinates?.[1] ?? null;
        return {
          address: titleCase(addrParts.join(" ").trim()),
          city: r.city ? titleCase(r.city) : "Unknown",
          lat: typeof lat === "number" ? lat : null,
          lon: typeof lon === "number" ? lon : null,
          phone: null,
          postalCode: r.zip_code ?? null,
          rawName: titleCase(name.trim()),
          region: (r.state ?? "NY").toUpperCase(),
          source: SOURCE,
          sourceId: String(r.license_number),
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
      `[ny-retail] offset=${offset} got=${rows.length} upserted=${values.length} total=${totalUpserted} elapsed=${elapsed}s`,
    );

    if (rows.length < PAGE) {
      break;
    }
  }

  console.log(`[ny-retail] DONE seen=${totalSeen} upserted=${totalUpserted}`);
  await pool.end();
}

main().catch((error) => {
  console.error("[ny-retail] FAILED:", error);
  process.exit(1);
});
