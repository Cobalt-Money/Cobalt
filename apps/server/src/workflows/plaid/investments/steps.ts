import {
  fetchHoldings,
  fetchInvestmentTransactionsPage,
} from "@cobalt-web/server-data/plaid/investments/actions";
import {
  upsertInvestmentActivities,
  upsertInvestmentPositions,
  upsertInvestmentSecurities,
} from "@cobalt-web/server-data/plaid/investments/mutations";
import type { Holding, InvestmentTransaction, Security } from "plaid";
import { RetryableError } from "workflow";

import { INVESTMENT_TRANSACTIONS_PAGE_SIZE } from "./lib.js";

const INVESTMENT_SKIP_ERROR_CODES = new Set([
  "NO_INVESTMENT_ACCOUNTS",
  "PRODUCT_NOT_READY",
  "PRODUCT_NOT_ENABLED",
  "PRODUCTS_NOT_SUPPORTED",
  "ADDITIONAL_CONSENT_REQUIRED",
]);

type PlaidStepResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "skip"; reason: string };

interface PlaidErrorInfo {
  errorCode?: string;
  errorMessage?: string;
}

function getPlaidErrorInfo(error: unknown): PlaidErrorInfo {
  if (
    !error ||
    typeof error !== "object" ||
    !("response" in error) ||
    !error.response ||
    typeof error.response !== "object" ||
    !("data" in error.response) ||
    !error.response.data ||
    typeof error.response.data !== "object"
  ) {
    return {};
  }
  const { data } = (error as { response: { data: Record<string, unknown> } })
    .response;
  return {
    errorCode:
      typeof data.error_code === "string" ? data.error_code : undefined,
    errorMessage:
      typeof data.error_message === "string" ? data.error_message : undefined,
  };
}

function isRateLimited(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "response" in error &&
    !!error.response &&
    typeof error.response === "object" &&
    "status" in error.response &&
    (error.response as { status: number }).status === 429
  );
}

/**
 * Decision layer for Plaid errors inside a fetch step:
 * - skip codes → return `{ kind: "skip" }` (workflow continues gracefully)
 * - rate limits → throw `RetryableError` (step retries after delay)
 * - anything else → rethrow (default step retry → eventual failure)
 */
function classifyPlaidError<T>(
  error: unknown,
  operation: string
): PlaidStepResult<T> {
  const { errorCode } = getPlaidErrorInfo(error);

  if (errorCode && INVESTMENT_SKIP_ERROR_CODES.has(errorCode)) {
    return { kind: "skip", reason: errorCode };
  }

  if (isRateLimited(error)) {
    throw new RetryableError(`Plaid rate limited: ${operation}`, {
      retryAfter: "1m",
    });
  }

  throw error;
}

/** Fetch the current holdings snapshot from Plaid. */
export async function fetchHoldingsStep(
  accessToken: string
): Promise<PlaidStepResult<{ holdings: Holding[]; securities: Security[] }>> {
  "use step";

  try {
    const data = await fetchHoldings(accessToken);
    return { data, kind: "ok" };
  } catch (error) {
    return classifyPlaidError(error, "investmentsHoldingsGet");
  }
}

/** Map + persist investment securities. */
export async function upsertSecuritiesStep(
  securities: Security[]
): Promise<number> {
  "use step";

  if (securities.length === 0) {
    return 0;
  }
  await upsertInvestmentSecurities(securities);
  return securities.length;
}

/** Map + persist investment positions (holdings). */
export async function upsertPositionsStep(
  holdings: Holding[]
): Promise<number> {
  "use step";

  if (holdings.length === 0) {
    return 0;
  }
  await upsertInvestmentPositions(holdings);
  return holdings.length;
}

/** Fetch a single page of investment transactions from Plaid. */
export async function fetchInvestmentTransactionsPageStep(
  accessToken: string,
  startDate: string,
  endDate: string,
  offset: number
): Promise<
  PlaidStepResult<{
    transactions: InvestmentTransaction[];
    securities: Security[];
    totalAvailable: number;
  }>
> {
  "use step";

  try {
    const data = await fetchInvestmentTransactionsPage(
      accessToken,
      startDate,
      endDate,
      offset,
      INVESTMENT_TRANSACTIONS_PAGE_SIZE
    );
    return { data, kind: "ok" };
  } catch (error) {
    return classifyPlaidError(error, "investmentsTransactionsGet");
  }
}

/** Map + persist investment activities (transactions). */
export async function upsertActivitiesStep(
  transactions: InvestmentTransaction[]
): Promise<number> {
  "use step";

  if (transactions.length === 0) {
    return 0;
  }
  await upsertInvestmentActivities(transactions);
  return transactions.length;
}
