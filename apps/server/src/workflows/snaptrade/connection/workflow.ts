import { ALERT_SOURCES, ALERT_TYPES } from "@cobalt-web/db/schema/users/alerts";
import type { Account } from "snaptrade-typescript-sdk";

import { insertAlertStep, resolveAlertsStep } from "../../shared/alert-steps";
import {
  deleteSnaptradeAuthorizationStep,
  fetchAccountsStep,
  getSnapTradeUserCredentialsStep,
  seedTodaySnaptradeSnapshotsStep,
  syncAccountBalancesStep,
  syncAccountDetailsStep,
  syncAccountOrdersStep,
  syncAccountPositionsStep,
  syncBrokerageAccountStep,
  syncRecentActivitiesStep,
  updateAuthorizationStatusStep,
  upsertAccountDetailsStep,
  upsertAccountsStep,
  getSnaptradeAuthorizationDbIdStep,
  upsertSnaptradeAuthorizationStep,
} from "./steps";
import type {
  ConnectionAddedParams,
  ConnectionBrokenParams,
  ConnectionDeletedParams,
  ConnectionUpdatedParams,
  HoldingsUpdatedParams,
  SnapTradeWorkflowResult,
} from "./steps";

export async function snaptradeConnectionAddedWorkflow(
  params: ConnectionAddedParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId, brokerageId } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const authDbId = await upsertSnaptradeAuthorizationStep(
      brokerageAuthorizationId,
      userCredentials.appUserId,
      brokerageId,
    );

    const accounts = await fetchAccountsStep(userCredentials);

    await upsertAccountsStep(accounts, authDbId, userCredentials.appUserId);
    await seedTodaySnaptradeSnapshotsStep(userId);

    return { eventType: "CONNECTION_ADDED", success: true, userId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_ADDED",
      success: false,
      userId,
    };
  }
}

async function snaptradeConnectionRepairedWorkflow(
  params: ConnectionUpdatedParams,
  eventType: "CONNECTION_UPDATED" | "CONNECTION_FIXED",
): Promise<SnapTradeWorkflowResult> {
  const { userId, brokerageAuthorizationId } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    await updateAuthorizationStatusStep(brokerageAuthorizationId, false);

    await resolveAlertsStep({
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: brokerageAuthorizationId,
    });

    const accounts = await fetchAccountsStep(userCredentials);

    await upsertAccountsStep(accounts, brokerageAuthorizationId, userCredentials.appUserId);

    return { eventType, success: true, userId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return { error: errorMessage, eventType, success: false, userId };
  }
}

export async function snaptradeConnectionUpdatedWorkflow(
  params: ConnectionUpdatedParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";
  return await snaptradeConnectionRepairedWorkflow(params, "CONNECTION_UPDATED");
}

export async function snaptradeConnectionFixedWorkflow(
  params: ConnectionUpdatedParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";
  return await snaptradeConnectionRepairedWorkflow(params, "CONNECTION_FIXED");
}

export async function snaptradeConnectionBrokenWorkflow(
  params: ConnectionBrokenParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId } = params;

  try {
    await updateAuthorizationStatusStep(brokerageAuthorizationId, true);

    await insertAlertStep({
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: brokerageAuthorizationId,
      type: ALERT_TYPES.CONNECTION_BROKEN,
      userId,
    });

    return { eventType: "CONNECTION_BROKEN", success: true, userId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_BROKEN",
      success: false,
      userId,
    };
  }
}

export async function snaptradeHoldingsUpdatedWorkflow(
  params: HoldingsUpdatedParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, accountId, brokerageAuthorizationId, details } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const authDbId = await getSnaptradeAuthorizationDbIdStep(brokerageAuthorizationId);

    const detailsResult = await syncAccountDetailsStep(accountId, userCredentials);

    let accountData: Account | undefined;
    if (detailsResult.success && "data" in detailsResult && detailsResult.data) {
      accountData = detailsResult.data as Account;
      await syncBrokerageAccountStep(accountId, authDbId, userCredentials, accountData);
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
        ? syncAccountBalancesStep(accountId, userCredentials, accountData)
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "ACCOUNT_HOLDINGS_UPDATED",
      success: false,
      userId,
    };
  }
}

export async function snaptradeConnectionDeletedWorkflow(
  params: ConnectionDeletedParams,
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId } = params;

  try {
    await deleteSnaptradeAuthorizationStep(brokerageAuthorizationId);

    await resolveAlertsStep({
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: brokerageAuthorizationId,
    });

    return { eventType: "CONNECTION_DELETED", success: true, userId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_DELETED",
      success: false,
      userId,
    };
  }
}
