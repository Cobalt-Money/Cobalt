import { ALERT_SOURCES, ALERT_TYPES } from "@cobalt-web/db/schema/features";

import {
  insertAlertStep,
  resolveAlertsStep,
} from "@/workflows/shared/alert-steps";

import {
  getSnapTradeUserCredentialsStep,
  fetchAccountsStep,
  upsertSnaptradeAuthorizationStep,
  updateAuthorizationStatusStep,
  deleteSnaptradeAuthorizationStep,
  upsertAccountsStep,
  getAuthorizationDisplayNameStep,
} from "./steps";
import type {
  SnapTradeWorkflowResult,
  ConnectionAddedParams,
  ConnectionUpdatedParams,
  ConnectionBrokenParams,
  ConnectionDeletedParams,
} from "./workflow-types";

// ============================================================================
// CONNECTION WORKFLOWS
// ============================================================================

/**
 * Workflow: Handle CONNECTION_ADDED webhook
 * Creates new brokerage authorization and syncs all accounts
 */
export async function snaptradeConnectionAddedWorkflow(
  params: ConnectionAddedParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId, brokerageId } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const authDbId = await upsertSnaptradeAuthorizationStep(
      brokerageAuthorizationId,
      userCredentials.appUserId,
      brokerageId
    );

    const accounts = await fetchAccountsStep(userCredentials);

    await upsertAccountsStep(accounts, authDbId, userCredentials.appUserId);

    return {
      eventType: "CONNECTION_ADDED",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_ADDED",
      success: false,
      userId,
    };
  }
}

/**
 * Shared logic for CONNECTION_UPDATED and CONNECTION_FIXED webhooks.
 * Both re-enable the authorization, resolve alerts, and refresh account data.
 */
async function snaptradeConnectionRepairedWorkflow(
  params: ConnectionUpdatedParams,
  eventType: "CONNECTION_UPDATED" | "CONNECTION_FIXED"
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

    await upsertAccountsStep(
      accounts,
      brokerageAuthorizationId,
      userCredentials.appUserId
    );

    return {
      eventType,
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType,
      success: false,
      userId,
    };
  }
}

/**
 * Workflow: Handle CONNECTION_UPDATED webhook
 * Re-enables authorization and refreshes account data
 */
export function snaptradeConnectionUpdatedWorkflow(
  params: ConnectionUpdatedParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";
  return snaptradeConnectionRepairedWorkflow(params, "CONNECTION_UPDATED");
}

/**
 * Workflow: Handle CONNECTION_BROKEN webhook
 * Marks authorization as disabled
 */
export async function snaptradeConnectionBrokenWorkflow(
  params: ConnectionBrokenParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId } = params;

  try {
    await updateAuthorizationStatusStep(brokerageAuthorizationId, true);

    const brokerageName = await getAuthorizationDisplayNameStep(
      brokerageAuthorizationId
    );
    await insertAlertStep({
      message: `Go to Accounts → Brokerage Accounts tab and click Reconnect on the ${brokerageName} card.`,
      metadata: { brokerageName },
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: brokerageAuthorizationId,
      title: `${brokerageName} connection broken`,
      type: ALERT_TYPES.CONNECTION_BROKEN,
      userId,
    });

    return {
      eventType: "CONNECTION_BROKEN",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_BROKEN",
      success: false,
      userId,
    };
  }
}

/**
 * Workflow: Handle CONNECTION_FIXED webhook
 * Re-enables authorization and refreshes account data (same as CONNECTION_UPDATED)
 */
export function snaptradeConnectionFixedWorkflow(
  params: ConnectionUpdatedParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";
  return snaptradeConnectionRepairedWorkflow(params, "CONNECTION_FIXED");
}

/**
 * Workflow: Handle CONNECTION_DELETED webhook
 * Deletes the brokerage authorization
 */
export async function snaptradeConnectionDeletedWorkflow(
  params: ConnectionDeletedParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, brokerageAuthorizationId } = params;

  try {
    await deleteSnaptradeAuthorizationStep(brokerageAuthorizationId);

    await resolveAlertsStep({
      source: ALERT_SOURCES.SNAPTRADE,
      sourceId: brokerageAuthorizationId,
    });

    return {
      eventType: "CONNECTION_DELETED",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      error: errorMessage,
      eventType: "CONNECTION_DELETED",
      success: false,
      userId,
    };
  }
}
