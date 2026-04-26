import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/transaction";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";

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
      externalId: transactionTable.externalId,
      userOverrideCategory: transactionTable.userOverrideCategory,
      userOverrideName: transactionTable.userOverrideName,
    })
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.source, "plaid"),
        inArray(transactionTable.externalId, transactionIds),
        or(
          isNotNull(transactionTable.userOverrideName),
          isNotNull(transactionTable.userOverrideCategory)
        )
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
          userOverrideCategory:
            row.userOverrideCategory as UserOverrides["userOverrideCategory"],
          userOverrideName: row.userOverrideName,
        },
      ])
  );
}
