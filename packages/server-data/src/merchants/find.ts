import { db } from "@cobalt-web/db";
import type { merchant } from "@cobalt-web/db/schema/merchants/merchant";
import { merchantLocation } from "@cobalt-web/db/schema/merchants/merchant-location";
import { and, eq, sql } from "drizzle-orm";

import { normalizeMerchantName, stripLocationTokens } from "./normalize.js";

type Merchant = typeof merchant.$inferSelect;
type MerchantLocation = typeof merchantLocation.$inferSelect;

export interface FindInput {
  name: string;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  storeNumber?: string | null;
  paymentChannel?: "in store" | "online" | "other" | null;
  date?: string | Date | null;
}

export interface UserContext {
  userId: string;
}

export type TraceFn = (step: string, data?: Record<string, unknown>) => void;

export type Confidence = "exact" | "high" | "med" | "low";

/**
 * SRI-353 — collapsed reasons. `singleton` and `chain_brand_only` removed;
 * the singleton auto-pin was the MTA → Mt Ararat Bakery hijack vector.
 */
export type MatchReason = "store_number" | "geo" | "address" | "city_region" | "brand_only";

export interface MatchResult {
  merchant: Merchant;
  location: MerchantLocation | null;
  confidence: Confidence;
  reason: MatchReason;
  /** Trigram similarity of the brand name match (0..1). Surfaced for audit log. */
  sim: number;
}

const TRGM_LIMIT = 5;
const TRGM_THRESHOLD = 0.4;
const GEO_RADIUS_M = 1000;

const CONFIDENCE_RANK: Record<Confidence, number> = { exact: 4, high: 3, low: 1, med: 2 };

/** Cap location-tier confidence by brand name similarity. A perfect zip / geo
 *  hit doesn't mean much if the brand match was a partial-word hijack. */
function capBySim(conf: Confidence, sim: number): Confidence {
  let cap: Confidence;
  if (sim >= 0.85) {
    cap = "exact";
  } else if (sim >= 0.7) {
    cap = "high";
  } else if (sim >= 0.6) {
    cap = "med";
  } else {
    cap = "low";
  }
  return CONFIDENCE_RANK[conf] <= CONFIDENCE_RANK[cap] ? conf : cap;
}

/**
 * Plaid uses USPS-style city literals; in NYC, `city = "New York"` resolves to
 * Manhattan ~96% of the time. DOHMH stores city as the borough literal
 * (Manhattan / Brooklyn / Queens / Bronx / Staten Island), so the literal
 * "New York" never matches without translation. Applied only in the
 * city_region branch — never as a singleton-tier substitute.
 */
const CITY_EXPANSION: Record<string, string[]> = {
  "NY:new york": ["Manhattan", "New York", "Brooklyn", "Queens", "Bronx", "Staten Island"],
  "NY:nyc": ["Manhattan", "New York", "Brooklyn", "Queens", "Bronx", "Staten Island"],
};

function expandCityCandidates(city: string, region: string | null): string[] {
  const key = `${(region ?? "").toUpperCase()}:${city.toLowerCase()}`;
  return CITY_EXPANSION[key] ?? [city];
}

/**
 * Public entrypoint. Routes to one of four anchor-required branches based on
 * the strongest Plaid-provided location signal; returns null when no anchor
 * exists. Killed in SRI-353: singleton tier, chain_brand_only fallback,
 * generic brand_only fallback — anything that wrote location without a
 * physical signal.
 */
// eslint-disable-next-line complexity
export async function findMerchantForTransaction(
  input: FindInput,
  _ctx: UserContext,
  trace?: TraceFn,
): Promise<MatchResult | null> {
  const t: TraceFn = trace ?? (() => {});
  const stripped = stripLocationTokens(input.name, input.city ?? null, input.region ?? null);
  const norm = normalizeMerchantName(stripped);
  t("normalize", { normalized: norm, rawName: input.name, stripped });
  if (norm.length < 2) {
    t("reject", { reason: "normalized_name_too_short" });
    return null;
  }

  if (input.storeNumber) {
    const res = await tryStoreNumberBranch(norm, input, t);
    if (res) {
      return res;
    }
    t("store_number_branch_miss", { fallthrough: true });
  }

  if (input.lat != null && input.lon != null) {
    return tryGeoBranch(norm, input, t);
  }

  if (input.address) {
    return tryAddressBranch(norm, input, t);
  }

  if (input.city && input.region) {
    return tryCityRegionBranch(norm, input, t);
  }

  t("reject", { reason: "no_location_anchor" });
  return null;
}

/* -------------------- branches -------------------- */

async function tryStoreNumberBranch(
  norm: string,
  input: FindInput,
  t: TraceFn,
): Promise<MatchResult | null> {
  const candidates = await trgmTopBrands(norm, TRGM_LIMIT, input.region ?? null);
  if (candidates.length === 0) {
    return null;
  }
  for (const c of candidates) {
    if ((c.sim ?? 0) < TRGM_THRESHOLD) {
      continue;
    }
    const hit = await byStoreNumber(c.row.id, input.storeNumber!);
    if (hit) {
      t("store_number_hit", { brand: c.row.canonicalName, sim: c.sim });
      return {
        confidence: capBySim("exact", c.sim ?? 0),
        location: hit,
        merchant: c.row,
        reason: "store_number",
        sim: c.sim ?? 0,
      };
    }
  }
  return null;
}

/**
 * Geo-anchored — single round-trip across `merchant_location` filtered by
 * radius + name trgm. Brand identity proven by proximity + name overlap
 * together; either alone is too weak. Replaces brand-first → geo ordering,
 * which couldn't match when Plaid `name` was POS garbage but coords were good.
 */
async function tryGeoBranch(
  norm: string,
  input: FindInput,
  t: TraceFn,
): Promise<MatchResult | null> {
  const normNoSpace = norm.replaceAll(/\s+/g, "");
  const lat = input.lat!;
  const lon = input.lon!;
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`);
    return tx.execute<GeoRow>(sql`
      SELECT
        ml.id AS ml_id, ml.address AS ml_address, ml.city AS ml_city, ml.region AS ml_region,
        ml.postal_code AS ml_postal_code, ml.country AS ml_country, ml.phone AS ml_phone,
        ml.lat AS ml_lat, ml.lon AS ml_lon, ml.store_number AS ml_store_number,
        ml.raw_name AS ml_raw_name, ml.source AS ml_source, ml.source_id AS ml_source_id,
        ml.also_seen_in AS ml_also_seen_in, ml.last_seen_at AS ml_last_seen_at,
        ml.created_at AS ml_created_at, ml.updated_at AS ml_updated_at,
        ml.merchant_id AS ml_merchant_id,
        m.id AS m_id, m.canonical_name AS m_canonical_name, m.name_normalized AS m_name_normalized,
        m.aliases AS m_aliases, m.domain AS m_domain, m.logo_url AS m_logo_url,
        m.category_system_key AS m_category_system_key, m.subtype AS m_subtype,
        m.tags AS m_tags, m.is_chain AS m_is_chain, m.location_count AS m_location_count,
        m.domain_guess_attempts AS m_domain_guess_attempts, m.domain_source AS m_domain_source,
        m.places_id AS m_places_id, m.created_at AS m_created_at, m.updated_at AS m_updated_at,
        m.deleted_at AS m_deleted_at,
        GREATEST(
          similarity(m.name_normalized, ${norm}),
          similarity(m.name_compact, ${normNoSpace}),
          word_similarity(m.name_normalized, ${norm}),
          word_similarity(${norm}, m.name_normalized),
          word_similarity(m.name_compact, ${normNoSpace})
        ) AS sim,
        earth_distance(ll_to_earth(ml.lat, ml.lon), ll_to_earth(${lat}, ${lon})) AS dist_m
      FROM merchant_location ml
      JOIN merchant m ON m.id = ml.merchant_id
      WHERE ml.lat IS NOT NULL AND ml.lon IS NOT NULL
        AND m.deleted_at IS NULL
        AND earth_distance(ll_to_earth(ml.lat, ml.lon), ll_to_earth(${lat}, ${lon})) < ${GEO_RADIUS_M}
        AND (m.name_normalized %> ${norm} OR m.name_compact %> ${normNoSpace})
      ORDER BY dist_m ASC, sim DESC
      LIMIT ${TRGM_LIMIT}
    `);
  });
  if (rows.rows.length === 0) {
    t("geo_branch_miss", { lat, lon, radiusM: GEO_RADIUS_M });
    return null;
  }
  const r = rows.rows[0]!;
  const sim = Number(r.sim);
  if (sim < TRGM_THRESHOLD) {
    t("geo_branch_reject", { reason: "sim_below_threshold", sim });
    return null;
  }
  t("geo_hit", { brand: r.m_canonical_name, distM: r.dist_m, sim });
  return {
    confidence: capBySim("high", sim),
    location: hydrateLocation(r),
    merchant: hydrateMerchant(r),
    reason: "geo",
    sim,
  };
}

/**
 * Address-anchored. Trgm brand candidates first (region-filtered), then
 * byAddress per candidate. If no specific merchant_location matches, returns
 * brand-only — street-level signal is enough to claim brand identity even
 * when our directory lacks that specific store.
 */
async function tryAddressBranch(
  norm: string,
  input: FindInput,
  t: TraceFn,
): Promise<MatchResult | null> {
  const candidates = await trgmTopBrands(norm, TRGM_LIMIT, input.region ?? null);
  if (candidates.length === 0) {
    t("address_branch_reject", { reason: "no_trgm_match" });
    return null;
  }
  const best = candidates[0]!;
  const sim = best.sim ?? 0;
  if (sim < TRGM_THRESHOLD) {
    t("address_branch_reject", { reason: "sim_below_threshold", sim });
    return null;
  }
  if (input.region && !best.row.isChain) {
    const inRegion = await brandHasLocationInRegion(best.row.id, input.region);
    if (!inRegion) {
      t("address_branch_reject", { reason: "non_chain_brand_not_in_region", region: input.region });
      return null;
    }
  }
  const cityCandidates = input.city
    ? expandCityCandidates(input.city, input.region ?? null)
    : [null];
  for (const cityCandidate of cityCandidates) {
    const hit = await byAddress(best.row.id, input.address!, cityCandidate, input.region ?? null);
    if (hit) {
      t("address_hit", { brand: best.row.canonicalName, sim });
      return {
        confidence: capBySim("high", sim),
        location: hit,
        merchant: best.row,
        reason: "address",
        sim,
      };
    }
  }
  t("address_branch_brand_only", { brand: best.row.canonicalName, sim });
  return {
    confidence: capBySim("high", sim),
    location: null,
    merchant: best.row,
    reason: "brand_only",
    sim,
  };
}

/**
 * City+region-anchored. Trgm brand candidates with region whitelist; for the
 * best candidate, try byCityRegion (with NYC borough expansion). Single hit →
 * write location too; 0 or multi hits → brand identity only. The old singleton
 * tier auto-pinned a non-chain's only location given any region match — that
 * was the MTA → Mt Ararat Bakery hijack vector. Gone.
 */
async function tryCityRegionBranch(
  norm: string,
  input: FindInput,
  t: TraceFn,
): Promise<MatchResult | null> {
  const candidates = await trgmTopBrands(norm, TRGM_LIMIT, input.region ?? null);
  if (candidates.length === 0) {
    t("city_region_branch_reject", { reason: "no_trgm_match" });
    return null;
  }
  const best = candidates[0]!;
  const sim = best.sim ?? 0;
  if (sim < TRGM_THRESHOLD) {
    t("city_region_branch_reject", { reason: "sim_below_threshold", sim });
    return null;
  }
  if (input.region && !best.row.isChain) {
    const inRegion = await brandHasLocationInRegion(best.row.id, input.region);
    if (!inRegion) {
      t("city_region_branch_reject", {
        reason: "non_chain_brand_not_in_region",
        region: input.region,
      });
      return null;
    }
  }
  const cityCandidates = expandCityCandidates(input.city!, input.region!);
  for (const cityCandidate of cityCandidates) {
    const hits = await byCityRegion(best.row.id, cityCandidate, input.region!);
    if (hits.length === 1) {
      t("city_region_hit", { brand: best.row.canonicalName, city: cityCandidate, sim });
      return {
        confidence: capBySim("high", sim),
        location: hits[0]!,
        merchant: best.row,
        reason: "city_region",
        sim,
      };
    }
    if (hits.length > 1) {
      break;
    }
  }
  t("city_region_brand_only", { brand: best.row.canonicalName, sim });
  return {
    confidence: capBySim("high", sim),
    location: null,
    merchant: best.row,
    reason: "brand_only",
    sim,
  };
}

/* -------------------- helpers -------------------- */

interface GeoRow extends Record<string, unknown> {
  ml_id: string;
  ml_address: string;
  ml_also_seen_in: { source: string; source_id: string }[];
  ml_city: string;
  ml_country: string;
  ml_created_at: Date;
  ml_last_seen_at: Date;
  ml_lat: number | null;
  ml_lon: number | null;
  ml_merchant_id: string;
  ml_phone: string | null;
  ml_postal_code: string | null;
  ml_raw_name: string;
  ml_region: string;
  ml_source: string;
  ml_source_id: string;
  ml_store_number: string | null;
  ml_updated_at: Date;
  m_aliases: string[];
  m_canonical_name: string;
  m_category_system_key: string;
  m_created_at: Date;
  m_deleted_at: Date | null;
  m_domain: string | null;
  m_domain_guess_attempts: unknown;
  m_domain_source: string | null;
  m_id: string;
  m_is_chain: boolean;
  m_location_count: number;
  m_logo_url: string | null;
  m_name_normalized: string;
  m_places_id: string | null;
  m_subtype: string | null;
  m_tags: string[];
  m_updated_at: Date;
  sim: number;
  dist_m: number;
}

function hydrateLocation(r: GeoRow): MerchantLocation {
  return {
    address: r.ml_address,
    alsoSeenIn: r.ml_also_seen_in,
    city: r.ml_city,
    country: r.ml_country,
    createdAt: r.ml_created_at,
    id: r.ml_id,
    lastSeenAt: r.ml_last_seen_at,
    lat: r.ml_lat,
    lon: r.ml_lon,
    merchantId: r.ml_merchant_id,
    phone: r.ml_phone,
    postalCode: r.ml_postal_code,
    rawName: r.ml_raw_name,
    region: r.ml_region,
    source: r.ml_source,
    sourceId: r.ml_source_id,
    storeNumber: r.ml_store_number,
    updatedAt: r.ml_updated_at,
  } satisfies MerchantLocation;
}

function hydrateMerchant(r: GeoRow): Merchant {
  return {
    aliases: r.m_aliases,
    canonicalName: r.m_canonical_name,
    categorySystemKey: r.m_category_system_key,
    createdAt: r.m_created_at,
    deletedAt: r.m_deleted_at,
    domain: r.m_domain,
    // biome-ignore lint: jsonb shape varies, typed at consumer
    domainGuessAttempts: r.m_domain_guess_attempts as never,
    domainSource: r.m_domain_source,
    id: r.m_id,
    isChain: r.m_is_chain,
    locationCount: r.m_location_count,
    logoUrl: r.m_logo_url,
    nameNormalized: r.m_name_normalized,
    placesId: r.m_places_id,
    subtype: r.m_subtype,
    tags: r.m_tags,
    updatedAt: r.m_updated_at,
  } satisfies Merchant;
}

async function trgmTopBrands(
  norm: string,
  limit: number,
  regionHint: string | null = null,
): Promise<{ row: Merchant; sim: number }[]> {
  const normNoSpace = norm.replaceAll(/\s+/g, "");
  const res = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL pg_trgm.word_similarity_threshold = ${TRGM_THRESHOLD}`);
    return tx.execute<{
      id: string;
      canonical_name: string;
      name_normalized: string;
      aliases: string[];
      domain: string | null;
      logo_url: string | null;
      category_system_key: string;
      subtype: string | null;
      tags: string[];
      is_chain: boolean;
      location_count: number;
      domain_guess_attempts: unknown;
      domain_source: string | null;
      places_id: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      sim: number;
    }>(sql`
    SELECT m.*,
           GREATEST(
             similarity(m.name_normalized, ${norm}),
             similarity(m.name_compact, ${normNoSpace}),
             word_similarity(m.name_normalized, ${norm}),
             word_similarity(${norm}, m.name_normalized),
             word_similarity(m.name_compact, ${normNoSpace}),
             word_similarity(${normNoSpace}, m.name_compact)
           ) AS sim
    FROM merchant m
    WHERE m.deleted_at IS NULL
      AND (m.name_normalized %> ${norm} OR m.name_compact %> ${normNoSpace})
    ORDER BY
      ${
        regionHint
          ? sql`(EXISTS (SELECT 1 FROM merchant_location ml WHERE ml.merchant_id = m.id AND ml.region = ${regionHint})) DESC,`
          : sql``
      }
      sim DESC,
      (m.domain IS NOT NULL) DESC,
      m.location_count DESC
    LIMIT ${limit}
  `);
  });
  return res.rows.map((r) => ({
    row: {
      aliases: r.aliases,
      canonicalName: r.canonical_name,
      categorySystemKey: r.category_system_key,
      createdAt: r.created_at,
      deletedAt: r.deleted_at,
      domain: r.domain,
      // biome-ignore lint: jsonb shape varies, typed at consumer
      domainGuessAttempts: r.domain_guess_attempts as never,
      domainSource: r.domain_source,
      id: r.id,
      isChain: r.is_chain,
      locationCount: r.location_count,
      logoUrl: r.logo_url,
      nameNormalized: r.name_normalized,
      placesId: r.places_id,
      subtype: r.subtype,
      tags: r.tags,
      updatedAt: r.updated_at,
    } satisfies Merchant,
    sim: r.sim,
  }));
}

async function byStoreNumber(
  merchantId: string,
  storeNumber: string,
): Promise<MerchantLocation | null> {
  const rows = await db
    .select()
    .from(merchantLocation)
    .where(
      and(
        eq(merchantLocation.merchantId, merchantId),
        eq(merchantLocation.storeNumber, storeNumber),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

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

async function byAddress(
  merchantId: string,
  address: string,
  city: string | null,
  region: string | null,
): Promise<MerchantLocation | null> {
  const normAddr = canonicalizeAddress(address);
  const canonExpr = sql`regexp_replace(
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
                          regexp_replace(lower(${merchantLocation.address}), '(\\d+)(st|nd|rd|th)\\M', '\\1', 'g'),
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
    '[^a-z0-9]', '', 'g')`;
  const filters = [eq(merchantLocation.merchantId, merchantId), sql`${canonExpr} = ${normAddr}`];
  if (city) {
    filters.push(sql`lower(${merchantLocation.city}) = lower(${city})`);
  }
  if (region) {
    filters.push(eq(merchantLocation.region, region));
  }
  const rows = await db
    .select()
    .from(merchantLocation)
    .where(and(...filters))
    .limit(1);
  return rows[0] ?? null;
}

async function byCityRegion(
  merchantId: string,
  city: string,
  region: string,
): Promise<MerchantLocation[]> {
  return db
    .select()
    .from(merchantLocation)
    .where(
      and(
        eq(merchantLocation.merchantId, merchantId),
        sql`lower(${merchantLocation.city}) = lower(${city})`,
        eq(merchantLocation.region, region),
      ),
    )
    .limit(5);
}

async function brandHasLocationInRegion(merchantId: string, region: string): Promise<boolean> {
  const rows = await db
    .select({ id: merchantLocation.id })
    .from(merchantLocation)
    .where(and(eq(merchantLocation.merchantId, merchantId), eq(merchantLocation.region, region)))
    .limit(1);
  return rows.length > 0;
}
