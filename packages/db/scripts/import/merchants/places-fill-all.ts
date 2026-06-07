/**
 * SRI-352 — Google Places fill for ALL merchants (not just chains).
 *
 * Same two-step pattern. Idempotent on places_id. Skips rows already filled.
 * Hard cap via MAX_CALLS env var (default 50000) to prevent runaway spend.
 * Processes in order of location_count DESC then random — high-signal first.
 */
import { eq, sql } from "drizzle-orm";

import { db, merchant, pool } from "./_lib/db";

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) {
  console.error("[places-all] GOOGLE_PLACES_KEY env var required");
  process.exit(2);
}

const CONCURRENCY = Number(process.env.CONCURRENCY ?? 10);
const MAX_CALLS = Number(process.env.MAX_CALLS ?? 50_000);
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

let callCount = 0;

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
  const parts = host.split(".");
  if (parts.length > 2) {
    host = parts.slice(-2).join(".");
  }
  return host;
}

async function textSearchIdOnly(query: string): Promise<string | null> {
  callCount++;
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
    console.warn(`[places-all] search ${res.status} "${query.slice(0, 60)}"`);
    return null;
  }
  const json = (await res.json()) as TextSearchResp;
  return json.places?.[0]?.id ?? null;
}

async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  callCount++;
  const res = await fetch(`${DETAILS_URL}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "id,displayName,websiteUri,formattedAddress,location,types",
    },
    method: "GET",
  });
  if (!res.ok) {
    console.warn(`[places-all] details ${res.status} for ${placeId}`);
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
}): Promise<"ok" | "no_web" | "no_place" | "err"> {
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
      return "no_place";
    }

    const details = await placeDetails(placeId);
    if (!details) {
      return "err";
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

    // clear conflicting head_guess domain on other merchants first
    if (domain) {
      await db.execute(sql`
        UPDATE merchant
           SET domain = NULL, domain_source = NULL, updated_at = now()
         WHERE domain = ${domain}
           AND id != ${m.id}
           AND (domain_source IS NULL OR domain_source = 'head_guess')
      `);
    }

    try {
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
    } catch {
      // unique domain conflict from another google_places row; still save places_id + subtype
      await db
        .update(merchant)
        .set({
          placesId: details.id,
          subtype: subtype ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(merchant.id, m.id));
    }

    return domain ? "ok" : "no_web";
  } catch (error) {
    console.warn(`[places-all] err id=${m.id}: ${String(error).slice(0, 200)}`);
    return "err";
  }
}

async function main() {
  const start = Date.now();

  console.log(`[places-all] config: CONCURRENCY=${CONCURRENCY} MAX_CALLS=${MAX_CALLS}`);

  const rows = await db.execute<{
    id: string;
    canonical_name: string;
    region: string | null;
    city: string | null;
    address: string | null;
  }>(sql`
    SELECT m.id, m.canonical_name, sub.region, sub.city, sub.address
    FROM merchant m
    LEFT JOIN LATERAL (
      SELECT region, city, address
      FROM merchant_location
      WHERE merchant_id = m.id
      ORDER BY (lat IS NOT NULL) DESC NULLS LAST, updated_at DESC
      LIMIT 1
    ) sub ON TRUE
    WHERE m.deleted_at IS NULL AND m.places_id IS NULL
    ORDER BY m.location_count DESC, m.id
  `);

  console.log(`[places-all] candidates=${rows.rows.length}`);
  let processed = 0;
  let ok = 0;
  let noWeb = 0;
  let noPlace = 0;
  let err = 0;
  let stopped = false;

  let cursor = 0;
  async function worker(_id: number) {
    while (cursor < rows.rows.length && !stopped) {
      if (callCount >= MAX_CALLS) {
        console.log(`[places-all] hit MAX_CALLS=${MAX_CALLS} cap, stopping`);
        stopped = true;
        return;
      }
      const idx = cursor++;
      const m = rows.rows[idx]!;
      const r = await processOne(m);
      processed++;
      if (r === "ok") {
        ok++;
      } else if (r === "no_web") {
        noWeb++;
      } else if (r === "no_place") {
        noPlace++;
      } else {
        err++;
      }
      if (processed % 100 === 0) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const rate = (processed / Number(elapsed)).toFixed(1);
        console.log(
          `[places-all] processed=${processed}/${rows.rows.length} ok=${ok} no_web=${noWeb} no_place=${noPlace} err=${err} calls=${callCount} rate=${rate}/s elapsed=${elapsed}s`,
        );
      }
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[places-all] DONE processed=${processed} ok=${ok} no_web=${noWeb} no_place=${noPlace} err=${err} calls=${callCount} elapsed=${elapsed}s`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("[places-all] FAILED:", error);
  process.exit(1);
});
