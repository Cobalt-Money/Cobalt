import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq } from "drizzle-orm";

/**
 * Hard-delete a manual transaction owned by `userId`. Idempotent — no error
 * if the row doesn't exist or isn't manual. `source = 'manual'` filter
 * excludes provider-managed rows. `transaction_tag` and `transaction_edit`
 * cascade via FK.
 */
export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  await db
    .delete(transaction)
    .where(
      and(
        eq(transaction.id, transactionId),
        eq(transaction.userId, userId),
        eq(transaction.source, "manual"),
      ),
    );
}
