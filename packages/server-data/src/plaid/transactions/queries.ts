import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/banking";
import { and, inArray, isNotNull, or } from "drizzle-orm";

export interface UserOverrides {
  userOverrideName: string | null;
  userOverrideCategory: { primary: string; detailed: string } | null;
}

export async function getUserOverrides(
  transactionIds: string[]
): Promise<Map<string, UserOverrides>> {
  if (transactionIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      plaidTransactionId: transactionTable.plaidTransactionId,
      userOverrideCategory: transactionTable.userOverrideCategory,
      userOverrideName: transactionTable.userOverrideName,
    })
    .from(transactionTable)
    .where(
      and(
        inArray(transactionTable.plaidTransactionId, transactionIds),
        or(
          isNotNull(transactionTable.userOverrideName),
          isNotNull(transactionTable.userOverrideCategory)
        )
      )
    );

  return new Map(
    rows.map((row) => [
      row.plaidTransactionId,
      {
        userOverrideCategory:
          row.userOverrideCategory as UserOverrides["userOverrideCategory"],
        userOverrideName: row.userOverrideName,
      },
    ])
  );
}
