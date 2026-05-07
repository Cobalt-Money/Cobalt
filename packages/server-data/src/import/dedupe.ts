import { distance as levenshtein } from "fastest-levenshtein";

/**
 * Dedupe heuristic used at the post-mapping stage to flag staged rows that already
 * exist as `transaction` rows on the target Cobalt account. Conservative: matches
 * are only flagged when all three signals line up — ±3 days, signed amount equal,
 * merchant Levenshtein < 3. A miss here just means an extra row gets committed,
 * which the user can manually delete; a false positive would silently drop their
 * imported data, so we err toward under-matching.
 */

const MAX_DATE_DRIFT_DAYS = 3;
const MAX_MERCHANT_LEVENSHTEIN = 3;

interface DateAmountMerchant {
  amount: number; // signed, Cobalt convention
  date: string; // ISO yyyy-MM-dd
  merchant: string;
}

function normalizeMerchant(s: string): string {
  return s.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function daysBetween(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00Z`).getTime();
  const bDate = new Date(`${b}T00:00:00Z`).getTime();
  return Math.abs(aDate - bDate) / 86_400_000;
}

/** Pure function — given a staged row and the existing-txn pool, return a match id or null. */
export function findDedupeMatch<TExisting extends DateAmountMerchant & { id: string }>(
  staged: DateAmountMerchant,
  existingPool: TExisting[],
): string | null {
  const stagedMerchant = normalizeMerchant(staged.merchant);
  for (const existing of existingPool) {
    if (existing.amount !== staged.amount) {
      continue;
    }
    if (daysBetween(existing.date, staged.date) > MAX_DATE_DRIFT_DAYS) {
      continue;
    }
    const dist = levenshtein(stagedMerchant, normalizeMerchant(existing.merchant));
    if (dist < MAX_MERCHANT_LEVENSHTEIN) {
      return existing.id;
    }
  }
  return null;
}
