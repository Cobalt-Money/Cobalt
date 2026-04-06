import {
  countLiabilitiesCategories,
  fetchLiabilitiesFromPlaid,
  upsertBankAccountsFromPlaidLiabilitiesAccounts,
} from "@cobalt-web/server-data/plaid/liabilities";
import { RetryableError } from "workflow";

const EMPTY_RESULT = {
  creditCount: 0,
  mortgageCount: 0,
  newAccountsCount: 0,
  studentCount: 0,
};

/**
 * Step: Sync liabilities for an item
 *
 * Calls /liabilities/get which returns credit, mortgage, and student loan data.
 * Also reconciles accounts that may not have been captured by the Transactions product.
 */
export async function syncLiabilitiesStep(accessToken: string, itemId: string) {
  "use step";

  try {
    const { accounts, liabilities } =
      await fetchLiabilitiesFromPlaid(accessToken);

    const { newAccountsCount } =
      await upsertBankAccountsFromPlaidLiabilitiesAccounts(itemId, accounts);

    return {
      ...countLiabilitiesCategories(liabilities),
      newAccountsCount,
    };
  } catch (error: unknown) {
    const { errorCode, errorMessage } = getPlaidErrorInfo(error);

    if (isLiabilitiesSkipError(errorCode)) {
      return EMPTY_RESULT;
    }

    if (isRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }

    const msg = formatPlaidErrorMessage(errorCode, errorMessage, error);

    throw new Error(`Plaid liabilities failed — ${msg}`, { cause: error });
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
  const { data } = (error as { response: { data: Record<string, unknown> } })
    .response;
  return {
    errorCode:
      typeof data.error_code === "string" ? data.error_code : undefined,
    errorMessage:
      typeof data.error_message === "string" ? data.error_message : undefined,
  };
}

/**
 * Liabilities-specific errors that mean "no liability data" — treat as success with empty result.
 * - ADDITIONAL_CONSENT_REQUIRED: User has not consented to Liabilities; no retry will help
 * - PRODUCT_NOT_READY: Plaid still extracting; webhook will fire when ready
 * - PRODUCT_NOT_ENABLED: Liabilities product not enabled for this item
 * - INVALID_PRODUCT_ACCESS: Institution doesn't support Liabilities for this item
 * - INSUFFICIENT_CREDENTIALS: Item needs re-auth
 * - NO_LIABILITY_ACCOUNTS: Item has no liability accounts (e.g. checking/savings only)
 */
function isLiabilitiesSkipError(errorCode: string | undefined): boolean {
  return [
    "ADDITIONAL_CONSENT_REQUIRED",
    "PRODUCT_NOT_READY",
    "PRODUCT_NOT_ENABLED",
    "INVALID_PRODUCT_ACCESS",
    "INSUFFICIENT_CREDENTIALS",
    "NO_LIABILITY_ACCOUNTS",
  ].includes(errorCode ?? "");
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
