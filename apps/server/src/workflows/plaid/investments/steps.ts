import { plaidClient } from "@cobalt-web/clients/plaid";
import {
  getTodayDateOnly,
  toDateOnlyString,
} from "@cobalt-web/server-data/lib/date";
import {
  upsertSecurity,
  upsertHolding,
  batchUpsertSecurities,
  batchUpsertInvestmentTransactions,
} from "@cobalt-web/server-data/plaid/investments/mutations";
import { RetryableError } from "workflow";

/**
 * Step: Sync holdings + securities for an item
 *
 * Calls /investments/holdings/get which returns both holdings AND securities.
 * Upserts securities first (shared reference data), then holdings.
 */
export async function syncHoldingsStep(accessToken: string, _itemId: string) {
  "use step";

  try {
    const response = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const { securities, holdings } = response.data;

    // Upsert securities first (reference data)
    if (securities.length > 0) {
      for (const s of securities) {
        await upsertSecurity(s);
      }
    }

    // Upsert holdings (positions)
    if (holdings.length > 0) {
      for (const h of holdings) {
        await upsertHolding(h);
      }
    }

    return {
      holdingsCount: holdings.length,
      securitiesCount: securities.length,
    };
  } catch (error: unknown) {
    const { errorCode, errorMessage } = getPlaidErrorInfo(error);

    if (isInvestmentSkipError(errorCode)) {
      return { holdingsCount: 0, securitiesCount: 0 };
    }

    if (isRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }

    const msg = formatPlaidErrorMessage(errorCode, errorMessage, error);

    throw new Error(`Plaid investments holdings failed — ${msg}`, {
      cause: error,
    });
  }
}

/**
 * Step: Sync investment transactions for an item
 *
 * Calls /investments/transactions/get with offset-based pagination.
 * Fetches full 24-month history. Upserts securities then transactions.
 */
export async function syncInvestmentTransactionsStep(
  accessToken: string,
  _itemId: string
) {
  "use step";

  try {
    const endDate = getTodayDateOnly();
    const startDate = toDateOnlyString(
      new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000)
    );

    let offset = 0;
    let totalTransactions = 0;
    let totalSecurities = 0;
    const seenSecurityIds = new Set<string>();
    const PAGE_SIZE = 500;

    let hasMore = true;
    while (hasMore) {
      const response = await plaidClient.investmentsTransactionsGet({
        access_token: accessToken,
        end_date: endDate,
        options: {
          count: PAGE_SIZE,
          offset,
        },
        start_date: startDate,
      });

      const {
        investment_transactions: transactions,
        securities,
        total_investment_transactions: totalAvailable,
      } = response.data;

      // Deduplicate securities from this page
      const newSecurities = securities.filter(
        (s) => !seenSecurityIds.has(s.security_id)
      );
      if (newSecurities.length > 0) {
        // Delegate to server-data primitive
        await batchUpsertSecurities(newSecurities);
        for (const s of newSecurities) {
          seenSecurityIds.add(s.security_id);
        }
        totalSecurities += newSecurities.length;
      }

      // Batch upsert transactions from this page
      if (transactions.length > 0) {
        // Delegate to server-data primitive
        await batchUpsertInvestmentTransactions(transactions);
        totalTransactions += transactions.length;
      }

      offset += transactions.length;
      hasMore = offset < totalAvailable;
    }

    return {
      securitiesCount: totalSecurities,
      transactionsCount: totalTransactions,
    };
  } catch (error: unknown) {
    const { errorCode, errorMessage } = getPlaidErrorInfo(error);

    if (isInvestmentSkipError(errorCode)) {
      return { securitiesCount: 0, transactionsCount: 0 };
    }

    if (isRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }

    const msg = formatPlaidErrorMessage(errorCode, errorMessage, error);

    throw new Error(`Plaid investment transactions failed — ${msg}`, {
      cause: error,
    });
  }
}

// ============================================================================
// Error formatting helper
// ============================================================================

function formatPlaidErrorMessage(
  errorCode: string | undefined,
  errorMessage: string | undefined,
  error: unknown
): string {
  if (errorCode && errorMessage) {
    return `${errorCode}: ${errorMessage}`;
  }
  if (errorCode) {
    return errorCode;
  }
  if (error instanceof Error) {
    return error.message || "Unknown error";
  }
  return String(error);
}

// ============================================================================
// Utility
// ============================================================================

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
  const data = error.response.data as Record<string, unknown>;
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
    error.response.status === 429
  );
}

/**
 * Investment-specific errors that mean "no investment data" — treat as success with empty result.
 * - NO_INVESTMENT_ACCOUNTS: Item has no investment accounts (e.g. checking/savings/loan only)
 * - PRODUCT_NOT_READY: Plaid still extracting; webhook will fire when ready
 * - PRODUCT_NOT_ENABLED: Investments product not enabled for this item
 * - PRODUCTS_NOT_SUPPORTED: Institution doesn't support Investments
 * - ADDITIONAL_CONSENT_REQUIRED: User has not consented to Investments; no retry will help
 */
function isInvestmentSkipError(errorCode: string | undefined): boolean {
  return [
    "NO_INVESTMENT_ACCOUNTS",
    "PRODUCT_NOT_READY",
    "PRODUCT_NOT_ENABLED",
    "PRODUCTS_NOT_SUPPORTED",
    "ADDITIONAL_CONSENT_REQUIRED",
  ].includes(errorCode ?? "");
}
