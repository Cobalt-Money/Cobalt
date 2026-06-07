/**
 * SRI-352 — Google Places domain fill for chains.
 *
 * Two-step: Text Search ID-only ($0/call) → Place Details Enterprise ($20/1k).
 * Overwrites any prior HEAD-guessed domain. Idempotent on places_id.
 *
 * Env: GOOGLE_PLACES_KEY (required), CONCURRENCY (default 5)
 */
import { eq, sql } from "drizzle-orm";

import { db, merchant, pool } from "./_lib/db";

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) {
  console.error("[places] GOOGLE_PLACES_KEY env var required");
  process.exit(2);
}

const CONCURRENCY = Number(process.env.CONCURRENCY ?? 5);
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

interface TextSearchResp {
  places?: { id: string }[];
}
interface PlaceDetails {
  id: string;
  displayName?: { text: string };
  websiteUri?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
}

function normalizeDomain(uri: string | undefined): string | null {
  if (!uri) {
    return null;
  }
  let host: string;
  try {
    host = new URL(uri).host.toLowerCase();
  } catch {
    return null;
  }
  if (!host) {
    return null;
  }
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }
  // collapse to apex: keep last two labels (US-only — fine for our dataset)
  const parts = host.split(".");
  if (parts.length > 2) {
    host = parts.slice(-2).join(".");
  }
  return host;
}

async function textSearchIdOnly(query: string): Promise<string | null> {
  const res = await fetch(SEARCH_URL, {
    body: JSON.stringify({ maxResultCount: 1, textQuery: query }),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.id",
    },
    method: "POST",
  });
  if (!res.ok) {
    console.warn(`[places] search ${res.status} for "${query}"`);
    return null;
  }
  const json = (await res.json()) as TextSearchResp;
  return json.places?.[0]?.id ?? null;
}

async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const res = await fetch(`${DETAILS_URL}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "id,displayName,websiteUri,formattedAddress,location,types",
    },
    method: "GET",
  });
  if (!res.ok) {
    console.warn(`[places] details ${res.status} for ${placeId}`);
    return null;
  }
  return (await res.json()) as PlaceDetails;
}

async function processOne(m: {
  id: string;
  canonical_name: string;
  region: string | null;
  city: string | null;
  address: string | null;
}): Promise<{ id: string; status: "ok" | "no_place" | "no_website" | "err" }> {
  const queryParts = [m.canonical_name];
  if (m.address) {
    queryParts.push(m.address);
  }
  if (m.city) {
    queryParts.push(m.city);
  }
  if (m.region) {
    queryParts.push(m.region);
  }
  const query = queryParts.join(" ");

  try {
    const placeId = await textSearchIdOnly(query);
    if (!placeId) {
      return { id: m.id, status: "no_place" };
    }

    const details = await placeDetails(placeId);
    if (!details) {
      return { id: m.id, status: "err" };
    }

    const domain = normalizeDomain(details.websiteUri);
    const subtype =
      details.types?.find(
        (t) =>
          t.endsWith("_restaurant") ||
          t.endsWith("_shop") ||
          t.endsWith("_store") ||
          t.endsWith("_cafe"),
      ) ?? details.types?.[0];

    // resolve potential domain unique conflict: Google is authoritative, so
    // null out any other merchant claiming this domain via HEAD guessing.
    if (domain) {
      await db.execute(sql`
        UPDATE merchant
           SET domain = NULL,
               domain_source = NULL,
               updated_at = now()
         WHERE domain = ${domain}
           AND id != ${m.id}
           AND (domain_source IS NULL OR domain_source = 'head_guess')
      `);
    }

    await db
      .update(merchant)
      .set({
        domain: domain ?? undefined,
        domainSource: domain ? "google_places" : undefined,
        placesId: details.id,
        subtype: subtype ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(merchant.id, m.id));

    return { id: m.id, status: domain ? "ok" : "no_website" };
  } catch (error) {
    console.warn(`[places] err id=${m.id} name="${m.canonical_name}": ${String(error)}`);
    return { id: m.id, status: "err" };
  }
}

async function main() {
  const start = Date.now();

  const rows = await db.execute<{
    id: string;
    canonical_name: string;
    region: string | null;
    city: string | null;
    address: string | null;
  }>(sql`
    SELECT m.id,
           m.canonical_name,
           sub.region,
           sub.city,
           sub.address
    FROM merchant m
    LEFT JOIN LATERAL (
      SELECT region, city, address
      FROM merchant_location
      WHERE merchant_id = m.id
      ORDER BY (lat IS NOT NULL) DESC NULLS LAST, updated_at DESC
      LIMIT 1
    ) sub ON TRUE
    WHERE m.is_chain = true
      AND m.deleted_at IS NULL
      AND m.places_id IS NULL
    ORDER BY m.location_count DESC
  `);

  console.log(`[places] candidates=${rows.rows.length}`);
  let processed = 0;
  let ok = 0;
  let noWeb = 0;
  let noPlace = 0;
  let err = 0;

  let cursor = 0;
  async function worker(id: number) {
    while (cursor < rows.rows.length) {
      const idx = cursor++;
      const m = rows.rows[idx]!;
      const r = await processOne(m);
      processed++;
      if (r.status === "ok") {
        ok++;
      } else if (r.status === "no_website") {
        noWeb++;
      } else if (r.status === "no_place") {
        noPlace++;
      } else {
        err++;
      }
      if (processed % 25 === 0) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(
          `[places] processed=${processed}/${rows.rows.length} ok=${ok} no_web=${noWeb} no_place=${noPlace} err=${err} elapsed=${elapsed}s`,
        );
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[places] DONE processed=${processed} ok=${ok} no_web=${noWeb} no_place=${noPlace} err=${err} elapsed=${elapsed}s`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("[places] FAILED:", error);
  process.exit(1);
});
