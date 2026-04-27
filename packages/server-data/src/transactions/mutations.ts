import { db } from "@cobalt-web/db";
import type { Transaction } from "@cobalt-web/db/schema/banking/transactions/transaction";
import { transaction } from "@cobalt-web/db/schema/banking/transactions/transaction";
import { eq } from "drizzle-orm";

/**
 * Sparse partial update — only the fields present in `patch` are written.
 * Pass `null` to clear an override (mirrors RFC 7396 JSON Merge Patch).
 */
export async function patchTransaction(
  transactionId: string,
  patch: Partial<
    Pick<
      Transaction,
      | "notes"
      | "userOverrideCategory"
      | "userOverrideDate"
      | "userOverrideLocation"
      | "userOverrideName"
    >
  >
) {
  if (Object.keys(patch).length === 0) {
    return;
  }
  await db
    .update(transaction)
    .set(patch)
    .where(eq(transaction.id, transactionId));
}
