import {
  fetchPlaidLiabilitiesStep,
  persistPlaidCreditLiabilitiesStep,
  persistPlaidLiabilityBankAccountsStep,
  persistPlaidLiabilityBankBalancesStep,
  persistPlaidMortgageLiabilitiesStep,
  persistPlaidStudentLoanLiabilitiesStep,
} from "./steps";

/** Fetch + persist the full liabilities snapshot for an item. */
export async function syncLiabilities(accessToken: string, plaidItemId: string): Promise<void> {
  const fetched = await fetchPlaidLiabilitiesStep(accessToken);

  if (fetched.skipped) {
    return;
  }

  await persistPlaidLiabilityBankAccountsStep(plaidItemId, fetched.accounts);
  await persistPlaidLiabilityBankBalancesStep(fetched.accounts);

  await Promise.all([
    persistPlaidCreditLiabilitiesStep(fetched.liabilities.credit),
    persistPlaidMortgageLiabilitiesStep(fetched.liabilities.mortgage),
    persistPlaidStudentLoanLiabilitiesStep(fetched.liabilities.student),
  ]);
}
