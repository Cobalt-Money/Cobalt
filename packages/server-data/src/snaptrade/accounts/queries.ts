import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/banking/financial-account";
import { and, eq, inArray } from "drizzle-orm";

export interface AccountRef {
  id: string;
  userId: string;
}

/**
 * Resolve financial_account rows for a batch of SnapTrade external account_ids.
 * Returns a Map keyed by SnapTrade account_id. Missing entries = orphaned/unsynced.
 */
export async function lookupFinancialAccountsBySnaptradeIds(
  snaptradeAccountIds: string[]
): Promise<Map<string, AccountRef>> {
  if (snaptradeAccountIds.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({
      externalId: financialAccount.externalId,
      id: financialAccount.id,
      userId: financialAccount.userId,
    })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "snaptrade"),
        inArray(financialAccount.externalId, snaptradeAccountIds)
      )
    );
  const map = new Map<string, AccountRef>();
  for (const r of rows) {
    if (r.externalId !== null) {
      map.set(r.externalId, { id: r.id, userId: r.userId });
    }
  }
  return map;
}

/** Resolve our internal DB row id for a SnapTrade account (scoped to user). */
export async function getBrokerageAccountDbId(
  snaptradeAccountId: string,
  userId: string
): Promise<string | null> {
  const rows = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.source, "snaptrade"),
        eq(financialAccount.externalId, snaptradeAccountId),
        eq(financialAccount.userId, userId)
      )
    )
    .limit(1);

  return rows.at(0)?.id ?? null;
}
