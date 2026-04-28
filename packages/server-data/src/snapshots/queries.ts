import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { toBalanceSnapshotDTO } from "./lib.js";
import type { BalanceSnapshot, BalanceSnapshotQuery } from "./schemas.js";

/**
 * Get balance snapshots with enriched account metadata. Joins
 * `snapshot ⨝ financial_account` and scopes by `snapshot.userId`.
 *
 * `filters.accountId` is the provider's external id on `financial_account`.
 */
export async function getBalanceSnapshotsByUserId(
  userId: string,
  filters: BalanceSnapshotQuery
): Promise<BalanceSnapshot[]> {
  const conditions = [eq(snapshot.userId, userId)];
  if (filters.accountId) {
    conditions.push(eq(financialAccount.externalId, filters.accountId));
  }
  if (filters.startDate) {
    conditions.push(gte(snapshot.snapshotDate, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(snapshot.snapshotDate, filters.endDate));
  }

  const rows = await db
    .select({
      available: snapshot.available,
      createdAt: snapshot.createdAt,
      creditLimit: snapshot.creditLimit,
      current: snapshot.current,
      externalId: financialAccount.externalId,
      id: snapshot.id,
      institutionName: financialAccount.institutionName,
      name: financialAccount.name,
      snapshotDate: snapshot.snapshotDate,
      subtype: financialAccount.subtype,
      type: financialAccount.type,
    })
    .from(snapshot)
    .innerJoin(financialAccount, eq(snapshot.accountId, financialAccount.id))
    .where(and(...conditions))
    .orderBy(asc(snapshot.snapshotDate));

  return rows.map((row) =>
    toBalanceSnapshotDTO({
      account: {
        externalId: row.externalId,
        institutionName: row.institutionName,
        name: row.name,
        subtype: row.subtype,
        type: row.type,
      },
      available: row.available,
      createdAt: row.createdAt,
      creditLimit: row.creditLimit,
      current: row.current,
      id: row.id,
      snapshotDate: row.snapshotDate,
    })
  );
}
