import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, sql } from "drizzle-orm";

import { upsertManualBalanceSnapshotsForUser } from "../../snapshots/mutations.js";

/**
 * Hard-delete a manual transaction owned by `userId`. Idempotent — no error
 * if the row doesn't exist or isn't manual. `source = 'manual'` filter
 * excludes provider-managed rows. `transaction_tag` and `transaction_edit`
 * cascade via FK.
 *
 * Also reverses the transaction's contribution to the manual account's
 * `balance.current` and re-snapshots, keeping the snapshot table in sync.
 */
export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const deleted = await db
    .delete(transaction)
    .where(
      and(
        eq(transaction.id, transactionId),
        eq(transaction.userId, userId),
        eq(transaction.source, "manual"),
      ),
    )
    .returning({
      accountId: transaction.accountId,
      amount: transaction.amount,
    });
  const [row] = deleted;
  if (!row) {
    return;
  }
  await db
    .update(balance)
    .set({ current: sql`${balance.current} - ${row.amount}` })
    .where(eq(balance.accountId, row.accountId));
  await upsertManualBalanceSnapshotsForUser(userId);
}
