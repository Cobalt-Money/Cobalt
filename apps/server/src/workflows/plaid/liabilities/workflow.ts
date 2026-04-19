import {
  captureWorkflowExceptionStep,
  toSerializableError,
} from "../../shared/steps";
import { getPlaidItemStep } from "../sync/steps";
import {
  fetchPlaidLiabilitiesStep,
  persistPlaidCreditLiabilitiesStep,
  persistPlaidLiabilityBankAccountsStep,
  persistPlaidLiabilityBankBalancesStep,
  persistPlaidMortgageLiabilitiesStep,
  persistPlaidStudentLoanLiabilitiesStep,
} from "./steps";

export interface PlaidLiabilitiesSyncResult {
  success: boolean;
  itemId: string;
  error?: string;
}

/** Webhook or post-link — same sync; safe to run repeatedly (DB upserts). */
export async function plaidLiabilitiesSyncWorkflow(
  itemId: string
): Promise<PlaidLiabilitiesSyncResult> {
  "use workflow";

  try {
    const item = await getPlaidItemStep(itemId);

    const fetched = await fetchPlaidLiabilitiesStep(item.plaidAccessToken);

    if (fetched.skipped) {
      return { itemId, success: true };
    }

    await persistPlaidLiabilityBankAccountsStep(
      item.plaidItemId,
      fetched.accounts
    );
    await persistPlaidLiabilityBankBalancesStep(fetched.accounts);

    await Promise.all([
      persistPlaidCreditLiabilitiesStep(fetched.liabilities.credit),
      persistPlaidMortgageLiabilitiesStep(fetched.liabilities.mortgage),
      persistPlaidStudentLoanLiabilitiesStep(fetched.liabilities.student),
    ]);

    return { itemId, success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await captureWorkflowExceptionStep(
      "plaid_liabilities",
      toSerializableError(error),
      { itemId }
    );

    return { error: errorMessage, itemId, success: false };
  }
}
