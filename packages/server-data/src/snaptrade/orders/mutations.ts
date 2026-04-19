import { db } from "@cobalt-web/db";
import { brokerageOrders } from "@cobalt-web/db/schema/brokerage";
import type { AccountOrderRecord } from "snaptrade-typescript-sdk";

import { getBrokerageAccountDbId } from "../accounts/queries.js";
import { mapOrderRecord } from "./lib.js";

export async function upsertAccountOrders(
  snaptradeAccountId: string,
  appUserId: string,
  ordersData: AccountOrderRecord[]
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

  const ordersToUpsert = ordersData.map((order) =>
    mapOrderRecord(
      order,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (ordersToUpsert.length === 0) {
    return;
  }

  try {
    await db.insert(brokerageOrders).values(ordersToUpsert);
  } catch {
    for (const orderData of ordersToUpsert) {
      try {
        await db
          .insert(brokerageOrders)
          .values(orderData)
          .onConflictDoUpdate({
            set: {
              accountId: dbAccountId,
              action: orderData.action,
              canceledQuantity: orderData.canceledQuantity,
              childBrokerageOrderIds: orderData.childBrokerageOrderIds,
              currencyCode: orderData.currencyCode,
              currencyId: orderData.currencyId,
              currencyName: orderData.currencyName,
              exchangeCode: orderData.exchangeCode,
              exchangeId: orderData.exchangeId,
              exchangeMicCode: orderData.exchangeMicCode,
              exchangeName: orderData.exchangeName,
              executionPrice: orderData.executionPrice,
              expirationDate: orderData.expirationDate,
              expiryDate: orderData.expiryDate,
              figiCode: orderData.figiCode,
              filledQuantity: orderData.filledQuantity,
              isMiniOption: orderData.isMiniOption,
              lastSync: currentSyncTime,
              limitPrice: orderData.limitPrice,
              openQuantity: orderData.openQuantity,
              optionSymbol: orderData.optionSymbol,
              optionType: orderData.optionType,
              orderType: orderData.orderType,
              quoteCurrency: orderData.quoteCurrency,
              quoteUniversalSymbol: orderData.quoteUniversalSymbol,
              rawSymbol: orderData.rawSymbol,
              securityTypeCode: orderData.securityTypeCode,
              securityTypeDescription: orderData.securityTypeDescription,
              securityTypeId: orderData.securityTypeId,
              snapTradeAccountId: snaptradeAccountId,
              status: orderData.status,
              stopPrice: orderData.stopPrice,
              strikePrice: orderData.strikePrice,
              symbolDescription: orderData.symbolDescription,
              symbolId: orderData.symbolId,
              timeExecuted: orderData.timeExecuted,
              timeInForce: orderData.timeInForce,
              timePlaced: orderData.timePlaced,
              timeUpdated: orderData.timeUpdated,
              totalQuantity: orderData.totalQuantity,
              universalSymbol: orderData.universalSymbol,
              userId: appUserId,
            },
            target: brokerageOrders.brokerageOrderId,
          });
      } catch (individualError) {
        console.error(
          `Failed to upsert individual order ${orderData.brokerageOrderId}:`,
          individualError
        );
      }
    }
  }
}
