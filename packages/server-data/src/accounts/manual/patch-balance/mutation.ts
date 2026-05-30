import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { and, eq } from "drizzle-orm";

import { upsertManualBalanceSnapshotsForUser } from "../../../snapshots/mutations.js";
import { ApiError } from "../../_shared/errors.js";
import type { PatchManualBalance } from "./schema.js";

/**
 * Set `balance.current` for a manual account. Caller-controlled sign — value
 * is written verbatim. Re-snapshots so net-worth views update immediately.
 */
export async function patchManualBalance(
  userId: string,
  accountId: string,
  patch: PatchManualBalance,
): Promise<void> {
  const account = await db.query.financialAccount.findFirst({
    columns: { id: true, source: true, userId: true },
    where: { id: { eq: accountId } },
  });
  if (!account || account.userId !== userId) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  if (account.source !== "manual") {
    throw new ApiError(400, "account_not_manual", "Balance can only be edited on manual accounts");
  }

  const updated = await db
    .update(balance)
    .set({ current: patch.current.toString() })
    .from(financialAccount)
    .where(
      and(
        eq(balance.accountId, financialAccount.id),
        eq(financialAccount.id, accountId),
        eq(financialAccount.userId, userId),
      ),
    )
    .returning({ id: balance.id });
  if (updated.length === 0) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }

  await upsertManualBalanceSnapshotsForUser(userId);
}
