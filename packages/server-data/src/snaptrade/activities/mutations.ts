import { db } from "@cobalt-web/db";
import { brokerageActivities } from "@cobalt-web/db/schema/brokerage";
import type { UniversalActivity } from "snaptrade-typescript-sdk";

import { getBrokerageAccountDbId } from "../accounts/queries.js";
import { mapActivityRecord } from "./lib.js";

export async function upsertAccountActivities(
  snaptradeAccountId: string,
  appUserId: string,
  activitiesData: UniversalActivity[]
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

  const activitiesToUpsert = activitiesData.map((activity) =>
    mapActivityRecord(
      activity,
      dbAccountId,
      snaptradeAccountId,
      appUserId,
      currentSyncTime
    )
  );

  if (activitiesToUpsert.length === 0) {
    return;
  }

  try {
    await db.insert(brokerageActivities).values(activitiesToUpsert);
  } catch {
    for (const activityData of activitiesToUpsert) {
      try {
        await db
          .insert(brokerageActivities)
          .values(activityData)
          .onConflictDoUpdate({
            set: {
              accountId: dbAccountId,
              amount: activityData.amount,
              currencyCode: activityData.currencyCode,
              currencyId: activityData.currencyId,
              currencyName: activityData.currencyName,
              description: activityData.description,
              exchangeCode: activityData.exchangeCode,
              exchangeId: activityData.exchangeId,
              exchangeMicCode: activityData.exchangeMicCode,
              exchangeName: activityData.exchangeName,
              externalReferenceId: activityData.externalReferenceId,
              fee: activityData.fee,
              figiCode: activityData.figiCode,
              fxRate: activityData.fxRate,
              institution: activityData.institution,
              lastSync: currentSyncTime,
              optionSymbol: activityData.optionSymbol,
              optionType: activityData.optionType,
              pagination: activityData.pagination,
              price: activityData.price,
              rawSymbol: activityData.rawSymbol,
              securityTypeCode: activityData.securityTypeCode,
              securityTypeDescription: activityData.securityTypeDescription,
              securityTypeId: activityData.securityTypeId,
              settlementDate: activityData.settlementDate,
              snapTradeAccountId: snaptradeAccountId,
              symbol: activityData.symbol,
              symbolDescription: activityData.symbolDescription,
              symbolId: activityData.symbolId,
              symbolTicker: activityData.symbolTicker,
              tradeDate: activityData.tradeDate,
              type: activityData.type,
              units: activityData.units,
              userId: appUserId,
            },
            target: brokerageActivities.activityId,
          });
      } catch (individualError) {
        console.error(
          `Failed to upsert individual activity ${activityData.activityId}:`,
          individualError
        );
      }
    }
  }
}
