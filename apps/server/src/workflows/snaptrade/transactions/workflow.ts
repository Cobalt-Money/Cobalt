import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import {
  fetchAllActivitiesStep,
  fetchIncrementalActivitiesStep,
  getSnapTradeUserCredentialsStep,
  refreshAccountDataStep,
  upsertActivitiesStep,
} from "./steps";
import type { SnapTradeWorkflowResult, TransactionsParams } from "./steps";

export async function snaptradeTransactionsInitialWorkflow(
  params: TransactionsParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, accountId } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const { activities } = await fetchAllActivitiesStep(
      accountId,
      userCredentials
    );

    await upsertActivitiesStep(
      accountId,
      userCredentials.appUserId,
      activities
    );

    await refreshAccountDataStep(accountId, userCredentials);

    return {
      eventType: "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "snaptrade_transactions",
      toSerializableError(error),
      { accountId, userId }
    );

    return {
      error: errorMessage,
      eventType: "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE",
      success: false,
      userId,
    };
  }
}

export async function snaptradeTransactionsUpdatedWorkflow(
  params: TransactionsParams
): Promise<SnapTradeWorkflowResult> {
  "use workflow";

  const { userId, accountId } = params;

  try {
    const userCredentials = await getSnapTradeUserCredentialsStep(userId);

    const incrementalResult = await fetchIncrementalActivitiesStep(
      accountId,
      userCredentials
    );

    let { activities } = incrementalResult;

    if (incrementalResult.lastSyncDate === null) {
      const fullResult = await fetchAllActivitiesStep(
        accountId,
        userCredentials
      );
      ({ activities } = fullResult);
    }

    await upsertActivitiesStep(
      accountId,
      userCredentials.appUserId,
      activities
    );

    await refreshAccountDataStep(accountId, userCredentials);

    return {
      eventType: "ACCOUNT_TRANSACTIONS_UPDATED",
      success: true,
      userId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "snaptrade_transactions",
      toSerializableError(error),
      { accountId, userId }
    );

    return {
      error: errorMessage,
      eventType: "ACCOUNT_TRANSACTIONS_UPDATED",
      success: false,
      userId,
    };
  }
}
