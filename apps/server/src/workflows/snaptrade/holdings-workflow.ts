import type { Account } from "snaptrade-typescript-sdk";

import {
  getSnapTradeUserCredentialsStep,
  upsertSnaptradeAuthorizationStep,
  syncAccountDetailsStep,
  upsertAccountDetailsStep,
  syncAccountBalancesStep,
  syncAccountPositionsStep,
  syncAccountOrdersStep,
  syncRecentActivitiesStep,
  syncBrokerageAccountStep,
} from "./steps";
import type {
  HoldingsUpdatedParams,
  SnapTradeWorkflowResult,
} from "./workflow-types";

// ============================================================================
// HOLDINGS WORKFLOW
// ============================================================================

/**
 * Workflow: Handle ACCOUNT_HOLDINGS_UPDATED webhook
 * Syncs all account data in parallel for maximum performance
 */
export async function snaptradeHoldingsUpdatedWorkflow(
  params: HoldingsUpdatedParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, accountId, brokerageAuthorizationId, details } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const authDbId = await upsertSnaptradeAuthorizationStep(
      brokerageAuthorizationId,
      userCredentials.appUserId,
      "" // brokerageId not needed for lookup
    );

    const detailsResult = await syncAccountDetailsStep(
      accountId,
      userCredentials
    );

    let accountData: Account | undefined;
    if (
      detailsResult.success &&
      "data" in detailsResult &&
      detailsResult.data
    ) {
      accountData = detailsResult.data as Account;
      await syncBrokerageAccountStep(
        accountId,
        authDbId,
        userCredentials,
        accountData
      );
    } else {
      return {
        error: "Failed to fetch account details from SnapTrade API",
        eventType: "ACCOUNT_HOLDINGS_UPDATED",
        success: false,
        userId,
      };
    }

    const shouldSyncBalances = details?.balances?.success !== false;
    const shouldSyncPositions = details?.positions?.success !== false;
    const shouldSyncOrders = details?.orders?.success !== false;

    await Promise.all([
      upsertAccountDetailsStep(accountId, userCredentials, accountData),

      shouldSyncBalances
        ? syncAccountBalancesStep(accountId, userCredentials)
        : Promise.resolve({ success: false }),

      shouldSyncPositions
        ? syncAccountPositionsStep(accountId, userCredentials)
        : Promise.resolve({ success: false } as {
            success: boolean;
            positionCount?: number;
          }),

      shouldSyncOrders
        ? syncAccountOrdersStep(accountId, userCredentials)
        : Promise.resolve({ success: false } as {
            success: boolean;
            orderCount?: number;
          }),

      syncRecentActivitiesStep(accountId, userCredentials),
    ]);

    return {
      eventType: "ACCOUNT_HOLDINGS_UPDATED",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "ACCOUNT_HOLDINGS_UPDATED",
      success: false,
      userId,
    };
  }
}
