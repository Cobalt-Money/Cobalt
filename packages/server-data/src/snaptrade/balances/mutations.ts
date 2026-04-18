import { db } from "@cobalt-web/db";
import { brokerageBalances } from "@cobalt-web/db/schema/brokerage";
import type { Balance } from "snaptrade-typescript-sdk";

import { getBrokerageAccountDbId } from "../accounts/queries.js";
import { toDecimalString } from "../lib.js";

export async function upsertAccountBalances(
  snaptradeAccountId: string,
  appUserId: string,
  balancesData: Balance[]
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

  const currentSyncTime = new Date();

  for (const balance of balancesData) {
    const currencyData = balance.currency || {};

    const balanceData = {
      accountId: dbAccountId,
      buyingPower: toDecimalString(balance.buying_power) || "0",
      cash: toDecimalString(balance.cash) || "0",
      currencyCode: currencyData.code || balance.currency_code || "USD",
      currencyId: currencyData.id || balance.currency_id || null,
      currencyName: currencyData.name || balance.currency_name || "US Dollar",
      lastSync: currentSyncTime,
      snapTradeAccountId: snaptradeAccountId,
      userId: appUserId,
    };

    await db
      .insert(brokerageBalances)
      .values(balanceData)
      .onConflictDoUpdate({
        set: {
          buyingPower: toDecimalString(balance.buying_power) || "0",
          cash: toDecimalString(balance.cash) || "0",
          currencyId: balanceData.currencyId,
          currencyName: balanceData.currencyName,
          lastSync: balanceData.lastSync,
          updatedAt: new Date(),
        },
        target: [brokerageBalances.accountId, brokerageBalances.currencyCode],
      });
  }
}
