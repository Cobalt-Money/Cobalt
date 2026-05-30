import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { and, eq } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";
import type { PatchAccount } from "./schema.js";

/**
 * Apply a partial update to an account. Ownership join folded into UPDATE —
 * zero rows updated → 404. No-op if `patch` has no recognised fields.
 *
 * `creditLimit` is stored as negative magnitude (liabilities canonical sign).
 * Null clears the user override.
 */
export async function patchAccount(id: string, userId: string, patch: PatchAccount): Promise<void> {
  if (patch.creditLimit === undefined) {
    // Nothing to update. Verify ownership so callers still get a 404 on
    // missing/unowned ids before they refetch.
    const row = await db.query.financialAccount.findFirst({
      columns: { id: true },
      where: { id: { eq: id }, userId: { eq: userId } },
    });
    if (!row) {
      throw new ApiError(404, "account_not_found", "Account not found");
    }
    return;
  }

  const userOverrideCreditLimit =
    patch.creditLimit === null ? null : String(-Math.abs(patch.creditLimit));

  const updated = await db
    .update(balance)
    .set({ userOverrideCreditLimit })
    .from(financialAccount)
    .where(
      and(
        eq(balance.accountId, financialAccount.id),
        eq(financialAccount.id, id),
        eq(financialAccount.userId, userId),
      ),
    )
    .returning({ id: balance.id });

  if (updated.length === 0) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
}
