const SUFFIXES = /\b(inc|llc|corp|co|ltd|the)\b\.?/g;

/**
 * Normalize a Plaid `merchant_name` (or `place.raw_name`) to a stable trgm key.
 * Mirrors the normalization the Overture importer applies to
 * `place.brand_name_normalized` — must stay aligned so trgm comparisons hit.
 */
export function normalizeBrandName(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/#?[ \t]{0,4}\d{1,10}[a-z]{0,2}[ \t]{0,4}$/gi, "")
    .replace(SUFFIXES, "")
    .replaceAll(/[^a-z0-9 ]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/** Compact (no-space) variant — second trgm column for word-similarity hits. */
export function compactBrandName(s: string): string {
  return normalizeBrandName(s).replaceAll(/\s+/g, "");
}

/**
 * Strip Plaid city/region tokens that leak into `merchant_name`
 * (e.g. "STARBUCKS NEW YORK NY"). Safe if the name is already clean.
 */
export function stripLocationTokens(
  name: string,
  city: string | null,
  region: string | null,
): string {
  let s = name;
  if (city) {
    s = s.replaceAll(new RegExp(`\\b${escapeRegex(city)}\\b`, "gi"), "");
  }
  if (region) {
    s = s.replaceAll(new RegExp(`\\b${escapeRegex(region)}\\b`, "gi"), "");
  }
  return s.replaceAll(/\s+/g, " ").trim();
}

function escapeRegex(s: string): string {
  return s.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
