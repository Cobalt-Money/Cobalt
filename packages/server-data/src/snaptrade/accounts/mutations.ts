import { db } from "@cobalt-web/db";
import {
  brokerageAccountDetails,
  brokerageAccounts,
} from "@cobalt-web/db/schema/brokerage";
import type { Account } from "snaptrade-typescript-sdk";

import { serializeJsonb } from "../lib.js";
import { buildAccountDetailsFields } from "./lib.js";
import { getBrokerageAccountDbId } from "./queries.js";

export async function upsertBrokerageAccount(
  accountId: string,
  brokerageAuthorizationId: string,
  appUserId: string,
  accountData: Account
): Promise<void> {
  const insertData = {
    accountId,
    accountNumber: accountData.number || null,
    accountStatus: accountData.status || "active",
    accountType: accountData.raw_type || "unknown",
    balanceData: serializeJsonb(accountData.balance || null),
    brokerageAuthId: brokerageAuthorizationId,
    cashRestrictions: serializeJsonb(accountData.cash_restrictions || null),
    createdDate: accountData.created_date
      ? new Date(accountData.created_date)
      : new Date(),
    institutionName: accountData.institution_name || "Unknown",
    lastSync: new Date(),
    metaData: serializeJsonb(accountData.meta || null),
    name: accountData.name || "Account",
    portfolioGroup: accountData.portfolio_group || null,
    syncStatus:
      typeof accountData.sync_status === "string"
        ? accountData.sync_status
        : "pending",
    userId: appUserId,
  };

  await db
    .insert(brokerageAccounts)
    .values(insertData)
    .onConflictDoUpdate({
      set: {
        accountNumber: insertData.accountNumber,
        accountStatus: insertData.accountStatus,
        accountType: insertData.accountType,
        balanceData: insertData.balanceData,
        brokerageAuthId: brokerageAuthorizationId,
        cashRestrictions: insertData.cashRestrictions,
        createdDate: insertData.createdDate,
        institutionName: insertData.institutionName,
        lastSync: new Date(),
        metaData: insertData.metaData,
        name: insertData.name,
        portfolioGroup: insertData.portfolioGroup,
        syncStatus: insertData.syncStatus as string,
        userId: appUserId,
      },
      target: brokerageAccounts.accountId,
    });
}

export async function upsertAccountDetails(
  snaptradeAccountId: string,
  appUserId: string,
  detailsData: Account
): Promise<void> {
  const dbAccountId = await getBrokerageAccountDbId(
    snaptradeAccountId,
    appUserId
  );
  if (!dbAccountId) {
    throw new Error(
      `Account not found or access denied: ${snaptradeAccountId} for user ${appUserId}`
    );
  }

  const fields = buildAccountDetailsFields(
    detailsData,
    appUserId,
    snaptradeAccountId
  );

  await db
    .insert(brokerageAccountDetails)
    .values({ accountId: dbAccountId, ...fields })
    .onConflictDoUpdate({
      set: { accountId: dbAccountId, ...fields },
      target: brokerageAccountDetails.snapTradeAccountId,
    });
}
