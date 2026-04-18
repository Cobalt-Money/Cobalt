import { fetchLiabilities } from "@cobalt-web/server-data/plaid/liabilities/actions";
import {
  insertBankAccountsOnConflictDoNothing,
  upsertBankBalancesForPlaidAccounts,
  upsertCreditLiabilities,
  upsertMortgageLiabilities,
  upsertStudentLoanLiabilities,
} from "@cobalt-web/server-data/plaid/liabilities/mutations";
import type {
  AccountBase,
  CreditCardLiability,
  LiabilitiesGetResponse,
  MortgageLiability,
  StudentLoan,
} from "plaid";
import { RetryableError } from "workflow";

import {
  mapCreditLiability,
  mapMortgageLiability,
  mapPlaidLiabilityBankAccount,
  mapPlaidLiabilityBankBalance,
  mapStudentLoan,
} from "./lib.js";

export type FetchPlaidLiabilitiesResult =
  | { skipped: true }
  | {
      skipped: false;
      accounts: AccountBase[];
      liabilities: LiabilitiesGetResponse["liabilities"];
    };

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

function isLiabilitiesSkipError(errorCode: string | undefined): boolean {
  return [
    "ADDITIONAL_CONSENT_REQUIRED",
    "INSUFFICIENT_CREDENTIALS",
    "INVALID_PRODUCT_ACCESS",
    "NO_LIABILITY_ACCOUNTS",
    "PRODUCT_NOT_ENABLED",
    "PRODUCT_NOT_READY",
  ].includes(errorCode ?? "");
}

function rethrowPlaidLiabilitiesFailure(error: unknown): never {
  const { errorCode, errorMessage } = getPlaidErrorInfo(error);
  const msg =
    errorCode && errorMessage
      ? `${errorCode}: ${errorMessage}`
      : (errorCode ??
        (error instanceof Error
          ? error.message || "Unknown error"
          : String(error)));
  throw new Error(`Plaid liabilities failed — ${msg}`, { cause: error });
}

/** Plaid `/liabilities/get` + skip / rate-limit policy (no DB). */
export async function fetchPlaidLiabilitiesStep(
  accessToken: string
): Promise<FetchPlaidLiabilitiesResult> {
  "use step";

  try {
    const { accounts, liabilities } = await fetchLiabilities(accessToken);
    return { accounts, liabilities, skipped: false };
  } catch (error: unknown) {
    const { errorCode } = getPlaidErrorInfo(error);

    if (isLiabilitiesSkipError(errorCode)) {
      return { skipped: true };
    }

    if (isRateLimited(error)) {
      throw new RetryableError("Plaid rate limited", { retryAfter: "1m" });
    }

    rethrowPlaidLiabilitiesFailure(error);
  }
}

export async function persistPlaidLiabilityBankAccountsStep(
  plaidItemId: string,
  accounts: AccountBase[]
): Promise<number> {
  "use step";

  const rows = accounts.map((a) =>
    mapPlaidLiabilityBankAccount(a, plaidItemId)
  );
  return await insertBankAccountsOnConflictDoNothing(rows);
}

export async function persistPlaidLiabilityBankBalancesStep(
  accounts: AccountBase[]
): Promise<void> {
  "use step";

  const rows = accounts.map(mapPlaidLiabilityBankBalance);
  await upsertBankBalancesForPlaidAccounts(rows);
}

export async function persistPlaidCreditLiabilitiesStep(
  credit: CreditCardLiability[] | null
): Promise<void> {
  "use step";

  const rows = (credit ?? [])
    .filter(
      (l): l is CreditCardLiability & { account_id: string } =>
        typeof l.account_id === "string"
    )
    .map(mapCreditLiability);
  await upsertCreditLiabilities(rows);
}

export async function persistPlaidMortgageLiabilitiesStep(
  mortgage: MortgageLiability[] | null
): Promise<void> {
  "use step";

  const rows = (mortgage ?? [])
    .filter(
      (l): l is MortgageLiability & { account_id: string } =>
        typeof l.account_id === "string"
    )
    .map(mapMortgageLiability);
  await upsertMortgageLiabilities(rows);
}

export async function persistPlaidStudentLoanLiabilitiesStep(
  student: StudentLoan[] | null
): Promise<void> {
  "use step";

  const rows = (student ?? [])
    .filter(
      (l): l is StudentLoan & { account_id: string } =>
        typeof l.account_id === "string"
    )
    .map(mapStudentLoan);
  await upsertStudentLoanLiabilities(rows);
}
