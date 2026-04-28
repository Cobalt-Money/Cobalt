import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, inArray, sql } from "drizzle-orm";

/** Fields carried forward from a pending → posted row during sync. */
export interface UserOverrides {
  category: string | null;
  categoryDetail: string | null;
  lockedFields: string[];
  name: string;
}

/**
 * Returns user-edited overrides for pending transactions that are about to be
 * replaced by posted rows. Only returns rows where the user has locked at least
 * one of: name, category, date.
 */
export async function getUserOverrides(
  transactionIds: string[]
): Promise<Map<string, UserOverrides>> {
  if (transactionIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      category: transactionTable.category,
      categoryDetail: transactionTable.categoryDetail,
      externalId: transactionTable.externalId,
      lockedFields: transactionTable.lockedFields,
      name: transactionTable.name,
    })
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.source, "plaid"),
        inArray(transactionTable.externalId, transactionIds),
        sql`jsonb_array_length(${transactionTable.lockedFields}) > 0`
      )
    );

  return new Map(
    rows
      .filter(
        (row): row is typeof row & { externalId: string } =>
          row.externalId !== null
      )
      .map((row) => [
        row.externalId,
        {
          category: row.category,
          categoryDetail: row.categoryDetail,
          lockedFields: row.lockedFields,
          name: row.name,
        },
      ])
  );
}
