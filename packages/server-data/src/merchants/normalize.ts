const SUFFIXES = /\b(inc|llc|corp|co|ltd|the)\b\.?/g;

/**
 * Normalize a Plaid merchant_name (or DB raw_name) to a stable lookup key.
 * Mirrors the normalization used by the directory importers; must stay aligned
 * so trgm comparisons hit clean.
 */
export function normalizeMerchantName(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/#?\s*\d+[a-z]{0,2}\s*$/gi, "") // trailing store number / chain id (e.g. "#4823", "47b")
    .replace(SUFFIXES, "")
    .replaceAll(/[^a-z0-9 ]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/**
 * Strip Plaid city/region tokens out of a merchant_name when they leak in
 * (e.g. "STARBUCKS NEW YORK NY"). Best-effort; safe if names already clean.
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
