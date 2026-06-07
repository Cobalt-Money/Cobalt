import { db } from "@cobalt-web/db";
import type { merchant } from "@cobalt-web/db/schema/merchants/merchant";
import { merchantLocation } from "@cobalt-web/db/schema/merchants/merchant-location";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

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
  /** Plaid txn date. Used to anchor the user-history region check so old txns
   *  (e.g. user lived in Charlotte before moving to NYC) don't get matched
   *  to today's modal region. */
  date?: string | Date | null;
}

export interface UserContext {
  userId: string;
  /** Optional override; if omitted, computed at runtime from recent txns. */
  commonRegion?: string | null;
}

export type TraceFn = (step: string, data?: Record<string, unknown>) => void;

export type Confidence = "exact" | "high" | "med" | "low";

export type MatchReason =
  | "store_number"
  | "geo"
  | "address"
  | "city_region"
  | "singleton"
  | "chain_brand_only"
  | "brand_only"
  | "llm";

export interface MatchResult {
  merchant: Merchant;
  location: MerchantLocation | null;
  confidence: Confidence;
  reason: MatchReason;
}

const TRGM_LIMIT = 5;
const TRGM_THRESHOLD = 0.4;
const GEO_RADIUS_M = 1000;

const CONFIDENCE_RANK: Record<Confidence, number> = { exact: 4, high: 3, low: 1, med: 2 };

/** Cap the location-tier confidence by the brand-name similarity. A great
 *  city+region pin doesn't mean much if the brand match was a partial-word
 *  hijack. */
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
 * Plaid uses USPS-style city conventions. In NYC, `city = "New York"` empirically
 * resolves to Manhattan ~96% of the time (verified against Cobalt's own Plaid
 * data + geocoded lat/lon). Our DOHMH-derived directory stores `city` as the
 * borough literal (Manhattan / Brooklyn / Queens / Bronx / Staten Island), so
 * the literal "New York" never matches without translation. This map widens
 * the search to the most likely borough first, then falls back.
 */
const CITY_EXPANSION: Record<string, string[]> = {
  // region:city → ordered list of candidate cities (most likely first)
  "NY:new york": ["Manhattan", "New York", "Brooklyn", "Queens", "Bronx", "Staten Island"],
  "NY:nyc": ["Manhattan", "New York", "Brooklyn", "Queens", "Bronx", "Staten Island"],
};

function expandCityCandidates(city: string, region: string | null): string[] {
  const key = `${(region ?? "").toUpperCase()}:${city.toLowerCase()}`;
  return CITY_EXPANSION[key] ?? [city];
}

/**
 * Public entrypoint. Given Plaid txn fields + user context, find the best
 * merchant (and optionally a specific location) from the canonical directory.
 * Returns null if no brand match crosses the trigram threshold.
 */
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

  const candidates = await trgmTopBrands(norm, TRGM_LIMIT, input.region ?? null);
  t("trgm_candidates", {
    count: candidates.length,
    top: candidates.map((c) => ({
      domain: c.row.domain,
      isChain: c.row.isChain,
      locationCount: c.row.locationCount,
      name: c.row.canonicalName,
      sim: c.sim,
    })),
  });
  if (candidates.length === 0) {
    t("reject", { reason: "no_trgm_match" });
    return null;
  }

  // Signal-aware brand scoring. Length-ratio is a *soft* penalty so a low-sim
  // chain like "Key Food" (vs Plaid "Key Food Stores") survives long enough to
  // be lifted by store#/zip/city hits in its own locations.
  const cityCandidates = input.city
    ? expandCityCandidates(input.city, input.region ?? null).map((c) => c.toLowerCase())
    : [];
  const signalHits = await brandLocationSignalHits(
    candidates.map((c) => c.row.id),
    {
      cityLower: cityCandidates,
      postalCode: input.postalCode ?? null,
      region: input.region ?? null,
      storeNumber: input.storeNumber ?? null,
    },
  );
  const scored = candidates.map((c) => {
    const hits = signalHits.get(c.row.id) ?? {
      cityLoc: null,
      storeLoc: null,
      zipLoc: null,
    };
    let score = c.sim ?? 0;
    if (hits.storeLoc) {
      score += 0.5;
    }
    if (hits.zipLoc) {
      score += 0.3;
    }
    if (hits.cityLoc) {
      score += 0.2;
    }
    if (c.row.isChain) {
      score += 0.05;
    }
    return { c, hits, score };
  });
  scored.sort((a, b) => b.score - a.score);
  t("brand_scoring", {
    top: scored.slice(0, 5).map((s) => ({
      cityHit: !!s.hits.cityLoc,
      name: s.c.row.canonicalName,
      score: Number(s.score.toFixed(3)),
      sim: s.c.sim,
      storeHit: !!s.hits.storeLoc,
      zipHit: !!s.hits.zipLoc,
    })),
  });
  const best = scored[0]!.c;
  // Stash any location we proved during scoring so Phase B can short-circuit.
  const prefetchedLocation: { hit: MerchantLocation; reason: MatchReason } | null = (() => {
    const h = scored[0]!.hits;
    if (h.storeLoc) {
      return { hit: h.storeLoc, reason: "store_number" };
    }
    if (h.zipLoc) {
      return { hit: h.zipLoc, reason: "address" };
    }
    if (h.cityLoc) {
      return { hit: h.cityLoc, reason: "city_region" };
    }
    return null;
  })();
  if ((best.sim ?? 0) < TRGM_THRESHOLD) {
    t("reject", { reason: "top_sim_below_threshold", sim: best.sim, threshold: TRGM_THRESHOLD });
    return null;
  }
  const brand: Merchant = best.row;
  const topSim = best.sim ?? 0;
  t("brand_selected", {
    domain: brand.domain,
    id: brand.id,
    isChain: brand.isChain,
    name: brand.canonicalName,
    sim: topSim,
  });
  // Build a result wrapper that auto-caps confidence by the brand similarity.
  const make = (
    location: MerchantLocation | null,
    rawConfidence: Confidence,
    reason: MatchReason,
  ): MatchResult => {
    const capped = capBySim(rawConfidence, topSim);
    if (capped !== rawConfidence) {
      t("confidence_capped_by_sim", { from: rawConfidence, sim: topSim, to: capped });
    }
    return { confidence: capped, location, merchant: brand, reason };
  };

  // Region whitelist: if Plaid said the txn was in region X — or if Plaid was
  // silent but the user's historical modal region is X — and this brand has
  // ZERO locations there, this is almost certainly a wrong match (same-name
  // brand in a different region). Bail for non-chains. Chains can match
  // brand-only across regions (Starbucks Charlotte NC → starbucks.com is fine).
  // Region whitelist — Plaid-provided only. We trust Plaid's region tag; we
  // don't infer regions from user history (too fragile across moves / travel).
  if (input.region && !brand.isChain) {
    const inRegion = await brandHasLocationInRegion(brand.id, input.region);
    t("region_check", { brandHasLocationInRegion: inRegion, region: input.region });
    if (!inRegion) {
      t("reject", { reason: "non_chain_brand_not_present_in_plaid_region" });
      return null;
    }
  }

  if (input.paymentChannel && input.paymentChannel !== "in store") {
    t("decision", { action: "brand_only", paymentChannel: input.paymentChannel, tier: "channel" });
    return make(null, "high", "brand_only");
  }

  // Short-circuit Phase B if scoring already proved a location hit.
  if (prefetchedLocation) {
    t("decision", {
      locationId: prefetchedLocation.hit.id,
      reason: prefetchedLocation.reason,
      tier: "phase_a_prefetch",
    });
    const conf: Confidence = prefetchedLocation.reason === "store_number" ? "exact" : "high";
    return make(prefetchedLocation.hit, conf, prefetchedLocation.reason);
  }

  if (input.storeNumber) {
    const hit = await byStoreNumber(brand.id, input.storeNumber);
    t("tier_1_store_number", { hit: hit ? hit.id : null, plaidStoreNumber: input.storeNumber });
    if (hit) {
      return make(hit, "exact", "store_number");
    }
  } else {
    t("tier_1_store_number", { skipped: "no_store_number_in_plaid" });
  }

  if (input.lat != null && input.lon != null) {
    const near = await nearestByGeo(brand.id, input.lat, input.lon, GEO_RADIUS_M);
    t("tier_2_geo", {
      hit: near ? near.id : null,
      lat: input.lat,
      lon: input.lon,
      radiusM: GEO_RADIUS_M,
    });
    if (near) {
      return make(near, "high", "geo");
    }
  } else {
    t("tier_2_geo", { skipped: "no_lat_lon_in_plaid" });
  }

  if (input.address) {
    const cityCandidates = input.city
      ? expandCityCandidates(input.city, input.region ?? null)
      : [null];
    let hit: MerchantLocation | null = null;
    let triedCity: string | null = null;
    for (const candidateCity of cityCandidates) {
      triedCity = candidateCity;
      hit = await byAddress(brand.id, input.address, candidateCity, input.region ?? null);
      if (hit) {
        break;
      }
    }
    t("tier_3_address", {
      hit: hit ? hit.id : null,
      plaidAddress: input.address,
      plaidCity: input.city,
      triedCity,
    });
    if (hit) {
      return make(hit, "high", "address");
    }
  } else {
    t("tier_3_address", { skipped: "no_address_in_plaid" });
  }

  if (input.city && input.region) {
    const cityCandidates = expandCityCandidates(input.city, input.region);
    for (const candidateCity of cityCandidates) {
      const cityHits = await byCityRegion(brand.id, candidateCity, input.region);
      t("tier_4_city_region", {
        expanded: cityCandidates.length > 1,
        hits: cityHits.length,
        plaidCity: input.city,
        region: input.region,
        triedCity: candidateCity,
      });
      if (cityHits.length === 1) {
        return make(cityHits[0]!, "high", "city_region");
      }
      if (cityHits.length > 1) {
        // multi-hit in this borough — fall through to user history tier
        break;
      }
      // 0 hits → try next candidate borough
    }
  } else {
    t("tier_4_city_region", { skipped: "missing_city_or_region" });
  }

  // Singleton bonus — only safe when Plaid gave a REGION signal (already
  // region-checked above against the brand). Without region, a Plaid-supplied
  // city alone (e.g. "Atlanta" for a brand whose only location is in LA)
  // would auto-pin wrong. Geo/store_number/address already returned earlier.
  if (!brand.isChain && brand.locationCount === 1 && input.region) {
    const loc = await onlyLocation(brand.id);
    t("tier_singleton", { brandLocationCount: 1, hit: loc ? loc.id : null });
    if (loc) {
      return make(loc, "high", "singleton");
    }
  }

  if (brand.isChain) {
    t("decision", { action: "chain_brand_only", tier: "chain_fallback" });
    return make(null, "high", "chain_brand_only");
  }

  // No inferred-history tier and no Plaid-region-only fallback. If we don't
  // have a sharp signal, return brand-only (no location guess).
  t("decision", { action: "brand_only", tier: "final_fallback" });
  return make(null, "high", "brand_only");
}

/* -------------------- helpers -------------------- */

/**
 * Phase A signal cross-check. For each candidate brand, find at most one
 * matching location per signal (store_number / postal_code / city+region).
 * Single batched query: one round-trip regardless of candidate count.
 */
interface BrandSignalHits {
  storeLoc: MerchantLocation | null;
  zipLoc: MerchantLocation | null;
  cityLoc: MerchantLocation | null;
}
async function brandLocationSignalHits(
  brandIds: string[],
  signals: {
    storeNumber: string | null;
    postalCode: string | null;
    cityLower: string[];
    region: string | null;
  },
): Promise<Map<string, BrandSignalHits>> {
  const out = new Map<string, BrandSignalHits>();
  if (brandIds.length === 0) {
    return out;
  }
  const wantStore = !!signals.storeNumber;
  const wantZip = !!signals.postalCode;
  const wantCity = signals.cityLower.length > 0 && !!signals.region;
  if (!wantStore && !wantZip && !wantCity) {
    return out;
  }

  const conds: ReturnType<typeof sql>[] = [];
  if (wantStore) {
    conds.push(sql`store_number = ${signals.storeNumber}`);
  }
  if (wantZip) {
    conds.push(sql`postal_code = ${signals.postalCode}`);
  }
  if (wantCity) {
    const cityLiteral = `{${signals.cityLower.map((c) => `"${c.replaceAll('"', '\\"')}"`).join(",")}}`;
    conds.push(
      sql`(lower(${merchantLocation.city}) = ANY(${cityLiteral}::text[]) AND ${merchantLocation.region} = ${signals.region})`,
    );
  }
  const orExpr = conds.reduce<ReturnType<typeof sql> | null>(
    (acc, c) => (acc ? sql`${acc} OR ${c}` : c),
    null,
  )!;
  const rows = await db
    .select()
    .from(merchantLocation)
    .where(and(inArray(merchantLocation.merchantId, brandIds), sql`(${orExpr})`));
  for (const r of rows) {
    const slot = out.get(r.merchantId!) ?? {
      cityLoc: null,
      storeLoc: null,
      zipLoc: null,
    };
    if (wantStore && !slot.storeLoc && r.storeNumber === signals.storeNumber) {
      slot.storeLoc = r;
    }
    if (wantZip && !slot.zipLoc && r.postalCode === signals.postalCode) {
      slot.zipLoc = r;
    }
    if (
      wantCity &&
      !slot.cityLoc &&
      r.region === signals.region &&
      signals.cityLower.includes(r.city.toLowerCase())
    ) {
      slot.cityLoc = r;
    }
    out.set(r.merchantId!, slot);
  }
  return out;
}

async function trgmTopBrands(
  norm: string,
  limit: number,
  regionHint: string | null = null,
): Promise<{ row: Merchant; sim: number }[]> {
  const normNoSpace = norm.replaceAll(/\s+/g, "");
  // SET LOCAL inside a tx is the pgbouncer-safe way to lower
  // pg_trgm.word_similarity_threshold for just this query. Default 0.6 is too
  // strict to surface candidates like "Key Food" inside Plaid "Key Food Stores"
  // (word_similarity = 0.5625). LOCAL reverts on commit — no app-wide GUC.
  // Raw SQL needed for the %> operator + similarity(); map snake_case → camelCase.
  const res = await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL pg_trgm.word_similarity_threshold = 0.4`);
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
             similarity(m.name_compact, ${norm}),
             similarity(m.name_compact, ${normNoSpace}),
             word_similarity(m.name_normalized, ${norm}),
             word_similarity(${norm}, m.name_normalized),
             word_similarity(m.name_compact, ${normNoSpace}),
             word_similarity(${normNoSpace}, m.name_compact)
           ) AS sim
    FROM merchant m
    WHERE m.deleted_at IS NULL
      -- Index-friendly filter: gin_trgm_ops supports the %> operator
      -- (word-similarity commutator) but NOT the <% form. Both semantically
      -- cover the "DB name is a continuous extent inside the Plaid name" case
      -- (e.g. "Key Food" inside "Key Food Stores"); only %> hits the GIN index.
      -- A 5-way OR with % and <% forces a Seq Scan (~553 ms vs ~4 ms indexed).
      -- Requires pg_trgm.word_similarity_threshold set to ~0.4 on the DB.
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
      id: r.id,
      canonicalName: r.canonical_name,
      nameNormalized: r.name_normalized,
      aliases: r.aliases,
      domain: r.domain,
      logoUrl: r.logo_url,
      categorySystemKey: r.category_system_key,
      subtype: r.subtype,
      tags: r.tags,
      isChain: r.is_chain,
      locationCount: r.location_count,
      // biome-ignore lint: jsonb shape varies, typed elsewhere
      domainGuessAttempts: r.domain_guess_attempts as never,
      domainSource: r.domain_source,
      placesId: r.places_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
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

async function nearestByGeo(
  merchantId: string,
  lat: number,
  lon: number,
  radiusM: number,
): Promise<MerchantLocation | null> {
  const distExpr = sql<number>`earth_distance(ll_to_earth(${merchantLocation.lat}, ${merchantLocation.lon}), ll_to_earth(${lat}, ${lon}))`;
  const rows = await db
    .select()
    .from(merchantLocation)
    .where(
      and(
        eq(merchantLocation.merchantId, merchantId),
        sql`${merchantLocation.lat} IS NOT NULL AND ${merchantLocation.lon} IS NOT NULL`,
        sql`${distExpr} < ${radiusM}`,
      ),
    )
    .orderBy(asc(distExpr))
    .limit(1);
  return rows[0] ?? null;
}

/** Address canonicalization: strip ordinal suffixes ("2nd" → "2"), expand
 *  common street abbreviations ("Ave" → "Avenue"), lowercase, drop everything
 *  non-alphanumeric. Makes Plaid's "1724 2nd Ave" match DOHMH's "1724 2 Avenue". */
function canonicalizeAddress(addr: string): string {
  const expansions: [RegExp, string][] = [
    [/\b(\d+)(st|nd|rd|th)\b/gi, "$1"], // 2nd → 2
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
  // Apply the same canonicalization to stored addresses via SQL — must mirror
  // canonicalizeAddress() above. Driven by PG regexp_replace chained inline.
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

async function onlyLocation(merchantId: string): Promise<MerchantLocation | null> {
  const rows = await db
    .select()
    .from(merchantLocation)
    .where(eq(merchantLocation.merchantId, merchantId))
    .limit(1);
  return rows[0] ?? null;
}
