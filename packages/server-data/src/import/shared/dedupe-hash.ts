import { createHash } from "node:crypto";

/**
 * Stable per-row hash for the `(userId, importHash)` UNIQUE on `transaction`.
 * Re-imports of the exact same line produce the same hash and are silently
 * skipped via ON CONFLICT DO NOTHING.
 *
 * Inputs are normalized so trivial whitespace / case noise doesn't defeat
 * dedup: amount is in integer cents, merchant is lowercased + collapsed.
 */
export function hashImportRow({
  accountId,
  amountCents,
  date,
  merchant,
}: {
  accountId: string;
  amountCents: number;
  date: string;
  merchant: string;
}): string {
  const normMerchant = merchant.trim().toLowerCase().replaceAll(/\s+/g, " ");
  return createHash("sha256")
    .update(`${accountId}|${date}|${String(amountCents)}|${normMerchant}`)
    .digest("hex");
}
