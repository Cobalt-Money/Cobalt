import type {
  HoldingsDefaultUpdateWebhook,
  InvestmentsDefaultUpdateWebhook,
  InvestmentsHistoricalUpdateWebhook,
  Security,
} from "plaid";

import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import { getPlaidItemStep } from "../sync/steps";
import { computeInvestmentTransactionsDateRange } from "./lib";
import {
  fetchHoldingsStep,
  fetchInvestmentTransactionsPageStep,
  upsertActivitiesStep,
  upsertPositionsStep,
  upsertSecuritiesStep,
} from "./steps";
import type { PlaidInvestmentSyncResult } from "./types";

export async function plaidInitialInvestmentSyncWorkflow(
  itemId: string
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);

    const holdingsFetch = await fetchHoldingsStep(item.plaidAccessToken);

    if (holdingsFetch.kind !== "skip") {
      await Promise.all([
        upsertSecuritiesStep(holdingsFetch.data.securities),
        upsertPositionsStep(holdingsFetch.data.holdings),
      ]);
    }

    const { startDate, endDate } = computeInvestmentTransactionsDateRange();

    let offset = 0;
    const seenSecurityIds = new Set<string>();

    while (true) {
      const pageResult = await fetchInvestmentTransactionsPageStep(
        item.plaidAccessToken,
        startDate,
        endDate,
        offset
      );

      if (pageResult.kind === "skip") {
        break;
      }

      const { transactions, securities, totalAvailable } = pageResult.data;

      const newSecurities = securities.filter(
        (s: Security) => !seenSecurityIds.has(s.security_id)
      );
      if (newSecurities.length > 0) {
        await upsertSecuritiesStep(newSecurities);
        for (const s of newSecurities) {
          seenSecurityIds.add(s.security_id);
        }
      }

      if (transactions.length > 0) {
        await upsertActivitiesStep(transactions);
      }

      offset += transactions.length;
      if (transactions.length === 0 || offset >= totalAvailable) {
        break;
      }
    }

    return { itemId, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_investments",
      toSerializableError(error),
      { itemId }
    );
    return { error: errorMessage, itemId, success: false };
  }
}

export async function plaidHoldingsWorkflow(
  webhook: HoldingsDefaultUpdateWebhook
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    const fetchResult = await fetchHoldingsStep(item.plaidAccessToken);
    if (fetchResult.kind !== "skip") {
      await Promise.all([
        upsertSecuritiesStep(fetchResult.data.securities),
        upsertPositionsStep(fetchResult.data.holdings),
      ]);
    }

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_investments",
      toSerializableError(error),
      { itemId: webhook.item_id }
    );
    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}

export async function plaidInvestmentTransactionsWorkflow(
  webhook: InvestmentsDefaultUpdateWebhook | InvestmentsHistoricalUpdateWebhook
): Promise<PlaidInvestmentSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(webhook.item_id);

    const { startDate, endDate } = computeInvestmentTransactionsDateRange();

    let offset = 0;
    const seenSecurityIds = new Set<string>();

    while (true) {
      const pageResult = await fetchInvestmentTransactionsPageStep(
        item.plaidAccessToken,
        startDate,
        endDate,
        offset
      );

      if (pageResult.kind === "skip") {
        break;
      }

      const { transactions, securities, totalAvailable } = pageResult.data;

      const newSecurities = securities.filter(
        (s: Security) => !seenSecurityIds.has(s.security_id)
      );
      if (newSecurities.length > 0) {
        await upsertSecuritiesStep(newSecurities);
        for (const s of newSecurities) {
          seenSecurityIds.add(s.security_id);
        }
      }

      if (transactions.length > 0) {
        await upsertActivitiesStep(transactions);
      }

      offset += transactions.length;
      if (transactions.length === 0 || offset >= totalAvailable) {
        break;
      }
    }

    return { itemId: webhook.item_id, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_investments",
      toSerializableError(error),
      { itemId: webhook.item_id }
    );
    return {
      error: errorMessage,
      itemId: webhook.item_id,
      success: false,
    };
  }
}
