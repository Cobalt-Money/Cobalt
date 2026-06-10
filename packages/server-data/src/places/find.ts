import { db } from "@cobalt-web/db";
import { place } from "@cobalt-web/db/schema/places/place";
import { getColumns, sql } from "drizzle-orm";

import { compactBrandName, normalizeBrandName, stripLocationTokens } from "./normalize.js";
import { expandCityCandidates, resolveLocalityZips } from "./zip-city.js";

type Place = typeof place.$inferSelect;

export type MatchReason =
  | "store_number"
  | "geo"
  | "postal"
  | "locality_zip"
  | "address"
  | "city_region";

export interface FindInput {
  name: string;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  storeNumber?: string | null;
}

export interface MatchResult {
  place: Place;
  reason: MatchReason;
  /** 0..1 trgm brand-name similarity at match time. */
  sim: number;
  /** 0..1 final confidence — sim plus anchor-strength boost. */
  confidence: number;
}

export type TraceFn = (step: string, data?: Record<string, unknown>) => void;

const TRGM_THRESHOLD = 0.4;
const GEO_RADIUS_M = 1000;

/**
 * Per-reason sim floor override. Most branches accept `TRGM_THRESHOLD` (0.4)
 * since the anchor (geo / postal / store_number) is precise enough to trust a
 * lenient name match. `locality_zip` is the exception: the anchor is a set of
 * city ZIPs derived from a generic locality lookup, so a weak trgm hit can
 * easily latch onto an unrelated brand sharing a substring (e.g. "Trader Joes"
 * → "Bean Traders Coffee" at sim 0.5). Demand a stronger name match before
 * accepting a `locality_zip` hit. Tracked under SRI-353.
 */
const REASON_SIM_FLOOR: Partial<Record<MatchReason, number>> = {
  city_region: 0.7,
  locality_zip: 0.7,
};

/**
 * Anchor boosts: stronger physical signals add to brand-name sim. A perfect
 * geo hit with weak name match still loses to a perfect name match with weak
 * geo — boosts cap the final score at 1 but never invert the sim ordering.
 */
const REASON_BOOST: Record<MatchReason, number> = {
  address: 0.1,
  city_region: 0,
  geo: 0.15,
  // Slightly weaker than `postal` — same query shape, but the ZIP set came
  // from a locality lookup rather than the txn itself, so the precision floor
  // is the city, not the actual swipe ZIP.
  locality_zip: 0.05,
  postal: 0.1,
  store_number: 0.2,
};

function makeConfidence(sim: number, reason: MatchReason): number {
  return Math.min(1, sim + REASON_BOOST[reason]);
}

/**
 * Filter cascade — try anchors strongest → weakest, first hit wins. Each
 * branch returns the top-ranked surviving row inside its filter window.
 * Soft rank: brand-name sim, then `brand_domain IS NOT NULL`, then source
 * freshness. No anchor → null (matcher refuses to guess).
 */
// eslint-disable-next-line complexity
export async function findPlaceForTransaction(
  input: FindInput,
  trace?: TraceFn,
): Promise<MatchResult | null> {
  const stripped = stripLocationTokens(input.name, input.city ?? null, input.region ?? null);
  const norm = normalizeBrandName(stripped);
  if (norm.length < 2) {
    trace?.("reject", { reason: "normalized_name_too_short" });
    return null;
  }
  const compact = compactBrandName(stripped);

  if (input.storeNumber && input.region) {
    const hit = await byStoreNumber(norm, compact, input.storeNumber, input.region);
    if (hit) {
      trace?.("store_number_hit", { brand: hit.place.brandName, sim: hit.sim });
      return hit;
    }
    trace?.("store_number_miss");
  }

  if (
    input.lat !== null &&
    input.lat !== undefined &&
    input.lon !== null &&
    input.lon !== undefined
  ) {
    const hit = await byGeo(norm, compact, input.lat, input.lon);
    if (hit) {
      trace?.("geo_hit", { brand: hit.place.brandName, sim: hit.sim });
      return hit;
    }
    trace?.("geo_miss", { lat: input.lat, lon: input.lon });
  }

  if (input.postalCode && input.region) {
    const hit = await byPostal(norm, compact, input.postalCode, input.region);
    if (hit) {
      trace?.("postal_hit", { brand: hit.place.brandName, sim: hit.sim });
      return hit;
    }
    trace?.("postal_miss");
  }

  // No-ZIP recovery: when Plaid omits `postal_code` but provides `city + region`,
  // resolve the locality to its set of ZIPs via the GeoNames-backed
  // `locality_zip` table and re-run the postal branch over that set. Solves the
  // ~33% of food txns Plaid sends without ZIPs (Charlotte/Durham/Pierre-class).
  if (!input.postalCode && input.city && input.region) {
    const zips = await resolveLocalityZips(input.city, input.region);
    if (zips.length > 0) {
      const hit = await byLocalityZips(norm, compact, zips, input.region);
      if (hit) {
        trace?.("locality_zip_hit", {
          brand: hit.place.brandName,
          sim: hit.sim,
          zip_candidates: zips.length,
        });
        return hit;
      }
      trace?.("locality_zip_miss", { zip_candidates: zips.length });
    }
  }

  if (input.address && input.region) {
    const hit = await byAddress(
      norm,
      compact,
      input.address,
      input.city ?? null,
      input.region,
      input.postalCode ?? null,
    );
    if (hit) {
      trace?.("address_hit", { brand: hit.place.brandName, sim: hit.sim });
      return hit;
    }
    trace?.("address_miss");
  }

  if (input.city && input.region) {
    const hit = await byCityRegion(
      norm,
      compact,
      input.city,
      input.region,
      input.postalCode ?? null,
    );
    if (hit) {
      trace?.("city_region_hit", { brand: hit.place.brandName, sim: hit.sim });
      return hit;
    }
    trace?.("city_region_miss");
  }

  trace?.("reject", { reason: "no_anchor_matched" });
  return null;
}

/* -------------------- helpers -------------------- */

/**
 * Trgm-sim expression shared across branches. Only full-string `similarity()`
 * is scored — `word_similarity()` was previously included but produced 1.0
 * for any single-token overlap (e.g. "Raja Sweet" → "Sweet" Manhattan place at
 * sim 1.0 because "sweet" is a complete substring of "raja sweet"). The
 * `%>` GIN filter in `trgmFilter` still uses word_similarity for candidate
 * retrieval; scoring just doesn't trust it.
 */
function simExpr(norm: string, compact: string) {
  return sql<number>`GREATEST(
    similarity(${place.brandNameNormalized}, ${norm}),
    similarity(${place.brandNameCompact}, ${compact})
  )`.as("sim");
}

/**
 * Trgm pre-filter for the WHERE clause. The `%>` (word-similarity) operator
 * is what `pg_trgm.word_similarity_threshold` gates — keeps the planner on
 * the GIN index instead of a seq scan.
 */
function trgmFilter(norm: string, compact: string) {
  return sql`(${place.brandNameNormalized} %> ${norm} OR ${place.brandNameCompact} %> ${compact})`;
}

function rankAndPick(
  rows: (Place & { sim: number | string })[],
  reason: MatchReason,
): MatchResult | null {
  const [top] = rows;
  if (!top) {
    return null;
  }
  const sim = typeof top.sim === "string" ? Number.parseFloat(top.sim) : top.sim;
  const floor = REASON_SIM_FLOOR[reason] ?? TRGM_THRESHOLD;
  if (sim < floor) {
    return null;
  }
  return { confidence: makeConfidence(sim, reason), place: top, reason, sim };
}

async function byStoreNumber(
  norm: string,
  compact: string,
  storeNumber: string,
  region: string,
): Promise<MatchResult | null> {
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.storeNumber} = ${storeNumber}
          AND ${place.region} = ${region}
          AND ${place.deletedAt} IS NULL
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`sim DESC, (${place.lat} IS NOT NULL AND ${place.lon} IS NOT NULL) DESC, (${place.brandDomain} IS NOT NULL) DESC, ${place.sourceUpdatedAt} DESC NULLS LAST`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "store_number");
}

async function byGeo(
  norm: string,
  compact: string,
  lat: number,
  lon: number,
): Promise<MatchResult | null> {
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.lat} IS NOT NULL
          AND ${place.lon} IS NOT NULL
          AND ${place.deletedAt} IS NULL
          AND earth_distance(ll_to_earth(${place.lat}, ${place.lon}), ll_to_earth(${lat}, ${lon})) < ${GEO_RADIUS_M}
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`earth_distance(ll_to_earth(${place.lat}, ${place.lon}), ll_to_earth(${lat}, ${lon})) ASC, sim DESC`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "geo");
}

async function byPostal(
  norm: string,
  compact: string,
  postalCode: string,
  region: string,
): Promise<MatchResult | null> {
  const zip5 = postalCode.slice(0, 5);
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.postalCode} = ${zip5}
          AND ${place.region} = ${region}
          AND ${place.deletedAt} IS NULL
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`sim DESC, (${place.lat} IS NOT NULL AND ${place.lon} IS NOT NULL) DESC, (${place.brandDomain} IS NOT NULL) DESC, ${place.sourceUpdatedAt} DESC NULLS LAST`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "postal");
}

/**
 * Same shape as `byPostal` but over a set of ZIPs resolved from a locality.
 * Used when Plaid omitted `postal_code` and we recovered the candidate ZIPs
 * via `resolveLocalityZips`. `place_postal_region_idx` still drives the scan.
 */
async function byLocalityZips(
  norm: string,
  compact: string,
  zip5s: string[],
  region: string,
): Promise<MatchResult | null> {
  if (zip5s.length === 0) {
    return null;
  }
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    const zipList = sql.join(
      zip5s.map((z) => sql`${z}`),
      sql`, `,
    );
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.postalCode} IN (${zipList})
          AND ${place.region} = ${region}
          AND ${place.deletedAt} IS NULL
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`sim DESC, (${place.lat} IS NOT NULL AND ${place.lon} IS NOT NULL) DESC, (${place.brandDomain} IS NOT NULL) DESC, ${place.sourceUpdatedAt} DESC NULLS LAST`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "locality_zip");
}

function cityInExpr(candidates: string[]) {
  return sql`lower(${place.city}) IN (${sql.join(
    candidates.map((c) => sql`${c.toLowerCase()}`),
    sql`, `,
  )})`;
}

async function byAddress(
  norm: string,
  compact: string,
  address: string,
  city: string | null,
  region: string,
  postalCode: string | null,
): Promise<MatchResult | null> {
  const normAddr = canonicalizeAddress(address);
  const cityCandidates = expandCityCandidates(city, region, postalCode);
  const cityClause = cityCandidates.length > 0 ? sql`AND ${cityInExpr(cityCandidates)}` : sql``;

  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.region} = ${region}
          AND ${place.deletedAt} IS NULL
          AND ${addressMatchExpr(normAddr)}
          ${cityClause}
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`sim DESC, (${place.lat} IS NOT NULL AND ${place.lon} IS NOT NULL) DESC, (${place.brandDomain} IS NOT NULL) DESC, ${place.sourceUpdatedAt} DESC NULLS LAST`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "address");
}

async function byCityRegion(
  norm: string,
  compact: string,
  city: string,
  region: string,
  postalCode: string | null,
): Promise<MatchResult | null> {
  const cityCandidates = expandCityCandidates(city, region, postalCode);
  if (cityCandidates.length === 0) {
    return null;
  }
  const rows = (await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`));
    return tx
      .select({ ...getColumns(place), sim: simExpr(norm, compact) })
      .from(place)
      .where(
        sql`${place.region} = ${region}
          AND ${cityInExpr(cityCandidates)}
          AND ${place.deletedAt} IS NULL
          AND ${trgmFilter(norm, compact)}`,
      )
      .orderBy(
        sql`sim DESC, (${place.lat} IS NOT NULL AND ${place.lon} IS NOT NULL) DESC, (${place.brandDomain} IS NOT NULL) DESC, ${place.sourceUpdatedAt} DESC NULLS LAST`,
      )
      .limit(1);
  })) as (Place & { sim: number | string })[];
  return rankAndPick(rows, "city_region");
}

/* -------------------- address canonicalization -------------------- */

/**
 * Strip ordinals + collapse common street suffixes (Ave/St/Blvd/…) to their
 * long form, then drop everything but alphanumerics. Mirrors the Plaid /
 * Overture freeform variance so "100 5th Ave" and "100 FIFTH AVENUE" collide.
 */
function canonicalizeAddress(addr: string): string {
  const expansions: [RegExp, string][] = [
    [/\b(\d+)(st|nd|rd|th)\b/gi, "$1"],
    [/\bave\b\.?/gi, "avenue"],
    [/\bst\b\.?/gi, "street"],
    [/\bblvd\b\.?/gi, "boulevard"],
    [/\brd\b\.?/gi, "road"],
    [/\bdr\b\.?/gi, "drive"],
    [/\bln\b\.?/gi, "lane"],
    [/\bpl\b\.?/gi, "place"],
    [/\bct\b\.?/gi, "court"],
    [/\bpkwy\b\.?/gi, "parkway"],
    [/\bhwy\b\.?/gi, "highway"],
    [/\bsq\b\.?/gi, "square"],
    [/\bter\b\.?/gi, "terrace"],
  ];
  let s = addr.toLowerCase();
  for (const [pattern, replacement] of expansions) {
    s = s.replace(pattern, replacement);
  }
  return s.replaceAll(/[^a-z0-9]/g, "");
}

/**
 * Equivalent canonicalization at the DB side, run on `place.address` for the
 * equality compare. Lives inline because Postgres has no equivalent of the
 * TS array-of-pairs loop — each `regexp_replace` is one nested call.
 */
function addressMatchExpr(normAddr: string) {
  return sql`regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(lower(${place.address}), '(\\d+)(st|nd|rd|th)\\M', '\\1', 'g'),
                          '\\mave\\.?\\M', 'avenue', 'g'),
                        '\\mst\\.?\\M', 'street', 'g'),
                      '\\mblvd\\.?\\M', 'boulevard', 'g'),
                    '\\mrd\\.?\\M', 'road', 'g'),
                  '\\mdr\\.?\\M', 'drive', 'g'),
                '\\mln\\.?\\M', 'lane', 'g'),
              '\\mpl\\.?\\M', 'place', 'g'),
            '\\mct\\.?\\M', 'court', 'g'),
          '\\mpkwy\\.?\\M', 'parkway', 'g'),
        '\\mhwy\\.?\\M', 'highway', 'g'),
      '\\msq\\.?\\M', 'square', 'g'),
    '[^a-z0-9]', '', 'g') = ${normAddr}`;
}
