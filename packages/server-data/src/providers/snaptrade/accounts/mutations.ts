import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { sql } from "drizzle-orm";
import type { Account } from "snaptrade-typescript-sdk";

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

export async function upsertBrokerageAccount(
  accountId: string,
  snaptradeAuthorizationDbId: string,
  appUserId: string,
  accountData: Account
): Promise<void> {
  const insertData = {
    accountNumber: accountData.number || null,
    externalId: accountId,
    institutionName: accountData.institution_name || "Unknown",
    name: accountData.name || "Account",
    snaptradeAuthorizationId: snaptradeAuthorizationDbId,
    source: "snaptrade" as const,
    status: accountData.status || "active",
    type: accountData.raw_type || "unknown",
    userId: appUserId,
  };

  await db
    .insert(financialAccount)
    .values(insertData)
    .onConflictDoUpdate({
      set: {
        accountNumber: sql`excluded.account_number`,
        institutionName: sql`excluded.institution_name`,
        name: sql`excluded.name`,
        snaptradeAuthorizationId: sql`excluded.snaptrade_authorization_id`,
        status: sql`excluded.status`,
        type: sql`excluded.type`,
        updatedAt: new Date(),
        userId: sql`excluded.user_id`,
      },
      target: [financialAccount.source, financialAccount.externalId],
      targetWhere: externalIdNotNullWhere,
    });
}

/**
 * No-op: per SRI-264 (D1) the brokerage_account_detail table was dropped from
 * the unified schema. Detail-level fields either live on `financial_account`
 * or are derivable on read; this adapter intentionally throws those writes
 * away so existing call sites continue to compile.
 */
export async function upsertAccountDetails(
  _snaptradeAccountId: string,
  _appUserId: string,
  _detailsData: Account
): Promise<void> {
  // intentionally empty — see SRI-264 D1
}
