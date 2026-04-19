import { db } from "@cobalt-web/db";
import { brokeragePositions } from "@cobalt-web/db/schema/brokerage";
import type { AccountHoldingsAccount } from "snaptrade-typescript-sdk";

import { getBrokerageAccountDbId } from "../accounts/queries.js";
import { mapPositionRecord } from "./lib.js";

type AnyRecord = Record<string, unknown>;

export async function upsertAccountPositions(
  snaptradeAccountId: string,
  appUserId: string,
  positionsData: AccountHoldingsAccount["positions"]
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

  if (!positionsData || !Array.isArray(positionsData)) {
    return;
  }

  const currentSyncTime = new Date();

  const positionsToUpsert = positionsData.map((position) =>
    mapPositionRecord(
      position as AnyRecord,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (positionsToUpsert.length === 0) {
    return;
  }

  try {
    await db.insert(brokeragePositions).values(positionsToUpsert);
  } catch {
    for (const positionData of positionsToUpsert) {
      try {
        await db
          .insert(brokeragePositions)
          .values(positionData)
          .onConflictDoUpdate({
            set: {
              averagePurchasePrice: positionData.averagePurchasePrice,
              currencyCode: positionData.currencyCode,
              currencyId: positionData.currencyId,
              currencyName: positionData.currencyName,
              exchangeCode: positionData.exchangeCode,
              exchangeId: positionData.exchangeId,
              exchangeMicCode: positionData.exchangeMicCode,
              exchangeName: positionData.exchangeName,
              figiCode: positionData.figiCode,
              isQuotable: positionData.isQuotable,
              isTradable: positionData.isTradable,
              lastSync: currentSyncTime,
              localId: positionData.localId,
              openPnl: positionData.openPnl,
              price: positionData.price,
              rawSymbol: positionData.rawSymbol,
              securityTypeCode: positionData.securityTypeCode,
              securityTypeDescription: positionData.securityTypeDescription,
              securityTypeId: positionData.securityTypeId,
              snapTradeAccountId: positionData.snapTradeAccountId,
              symbolDescription: positionData.symbolDescription,
              symbolId: positionData.symbolId,
              units: positionData.units,
              updatedAt: new Date(),
              userId: positionData.userId,
            },
            target: [brokeragePositions.accountId, brokeragePositions.symbol],
          });
      } catch (individualError) {
        console.error(
          `Failed to upsert individual position ${positionData.symbol}:`,
          individualError
        );
      }
    }
  }
}
