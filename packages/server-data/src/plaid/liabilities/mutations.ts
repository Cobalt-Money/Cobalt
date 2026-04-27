import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/banking/balances/balance";
import { financialAccount } from "@cobalt-web/db/schema/banking/financial-account";
import { creditLiability } from "@cobalt-web/db/schema/banking/liabilities/credit";
import { mortgageLiability } from "@cobalt-web/db/schema/banking/liabilities/mortgage";
import { studentLoanLiability } from "@cobalt-web/db/schema/banking/liabilities/student-loan";
import { sql } from "drizzle-orm";
import type {
  AccountBase,
  CreditCardLiability,
  MortgageLiability as PlaidMortgageLiability,
  StudentLoan,
} from "plaid";

import {
  lookupFinancialAccountsByPlaidIds,
  lookupPlaidConnection,
} from "../link/queries.js";

const BATCH_SIZE = 100;

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

function numToStr(
  value: number | string | boolean | null | undefined
): string | null {
  return value === null || value === undefined ? null : String(value);
}

/**
 * Insert financial_account rows for Plaid liability accounts. Skips on
 * (source='plaid', external_id) conflict so existing accounts aren't touched.
 * Returns the count of newly-inserted rows.
 */
export async function insertBankAccountsOnConflictDoNothing(
  accounts: AccountBase[],
  plaidItemId: string
): Promise<number> {
  if (accounts.length === 0) {
    return 0;
  }

  const conn = await lookupPlaidConnection(plaidItemId);
  if (!conn) {
    throw new Error(`plaid_connection not found for item ${plaidItemId}`);
  }

  const rows = accounts.map((a) => ({
    externalId: a.account_id,
    mask: a.mask ?? null,
    name: a.name || a.official_name || "Account",
    officialName: a.official_name ?? null,
    persistentAccountId: a.persistent_account_id ?? null,
    plaidConnectionId: conn.id,
    source: "plaid" as const,
    subtype: a.subtype ?? null,
    type: a.type,
    userId: conn.userId,
    verificationStatus: (a.verification_status as string) ?? null,
  }));

  let inserted = 0;
  for (const row of rows) {
    const result = await db
      .insert(financialAccount)
      .values(row)
      .onConflictDoNothing({
        target: [financialAccount.source, financialAccount.externalId],
        where: externalIdNotNullWhere,
      })
      .returning({ id: financialAccount.id });

    if (result.length > 0) {
      inserted += 1;
    }
  }

  return inserted;
}

/**
 * Upsert balance rows for Plaid liability accounts. One row per financial
 * account (unique constraint on `balance.account_id`).
 */
export async function upsertBankBalancesForPlaidAccounts(
  accounts: AccountBase[]
): Promise<void> {
  if (accounts.length === 0) {
    return;
  }

  const plaidAccountIds = [...new Set(accounts.map((a) => a.account_id))];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const rows = accounts
    .map((a) => {
      const acct = accountMap.get(a.account_id);
      if (!acct) {
        return null;
      }
      return {
        accountId: acct.id,
        available: numToStr(a.balances.available),
        current: String(a.balances.current ?? 0),
        isoCurrencyCode: a.balances.iso_currency_code ?? null,
        limit: numToStr(a.balances.limit),
        unofficialCurrencyCode: a.balances.unofficial_currency_code ?? null,
        userId: acct.userId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return;
  }

  await db
    .insert(balance)
    .values(rows)
    .onConflictDoUpdate({
      set: {
        available: sql`excluded.available`,
        current: sql`excluded.current`,
        isoCurrencyCode: sql`excluded.iso_currency_code`,
        limit: sql`excluded.limit`,
        unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
        updatedAt: new Date(),
      },
      target: balance.accountId,
    });
}

export async function upsertCreditLiabilities(
  liabilities: CreditCardLiability[]
): Promise<void> {
  if (liabilities.length === 0) {
    return;
  }

  const plaidAccountIds = [
    ...new Set(
      liabilities
        .map((l) => l.account_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const rows = liabilities
    .map((l) => {
      if (!l.account_id) {
        return null;
      }
      const acct = accountMap.get(l.account_id);
      if (!acct) {
        return null;
      }
      return {
        accountId: acct.id,
        aprs: l.aprs ?? null,
        isOverdue: l.is_overdue ?? false,
        lastPaymentAmount: numToStr(l.last_payment_amount),
        lastPaymentDate: l.last_payment_date ?? null,
        lastStatementBalance: numToStr(l.last_statement_balance),
        lastStatementIssueDate: l.last_statement_issue_date ?? null,
        minimumPaymentAmount: numToStr(l.minimum_payment_amount),
        nextPaymentDueDate: l.next_payment_due_date ?? null,
        userId: acct.userId,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(creditLiability)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          aprs: sql`excluded.aprs`,
          isOverdue: sql`excluded.is_overdue`,
          lastPaymentAmount: sql`excluded.last_payment_amount`,
          lastPaymentDate: sql`excluded.last_payment_date`,
          lastStatementBalance: sql`excluded.last_statement_balance`,
          lastStatementIssueDate: sql`excluded.last_statement_issue_date`,
          minimumPaymentAmount: sql`excluded.minimum_payment_amount`,
          nextPaymentDueDate: sql`excluded.next_payment_due_date`,
          updatedAt: new Date(),
        },
        target: creditLiability.accountId,
      });
  }
}

export async function upsertMortgageLiabilities(
  liabilities: PlaidMortgageLiability[]
): Promise<void> {
  if (liabilities.length === 0) {
    return;
  }

  const plaidAccountIds = [
    ...new Set(
      liabilities
        .map((l) => l.account_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const rows = liabilities
    .map((l) => {
      if (!l.account_id) {
        return null;
      }
      const acct = accountMap.get(l.account_id);
      if (!acct) {
        return null;
      }
      return {
        accountId: acct.id,
        accountNumber: l.account_number ?? null,
        currentLateFee: numToStr(l.current_late_fee),
        escrowBalance: numToStr(l.escrow_balance),
        hasPmi: l.has_pmi ?? null,
        hasPrepaymentPenalty: l.has_prepayment_penalty ?? null,
        interestRate: l.interest_rate ?? null,
        lastPaymentAmount: numToStr(l.last_payment_amount),
        lastPaymentDate: l.last_payment_date ?? null,
        loanTerm: l.loan_term ?? null,
        loanTypeDescription: l.loan_type_description ?? null,
        maturityDate: l.maturity_date ?? null,
        nextMonthlyPayment: numToStr(l.next_monthly_payment),
        nextPaymentDueDate: l.next_payment_due_date ?? null,
        originationDate: l.origination_date ?? null,
        originationPrincipalAmount: numToStr(l.origination_principal_amount),
        pastDueAmount: numToStr(l.past_due_amount),
        propertyAddress: l.property_address ?? null,
        userId: acct.userId,
        ytdInterestPaid: numToStr(l.ytd_interest_paid),
        ytdPrincipalPaid: numToStr(l.ytd_principal_paid),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(mortgageLiability)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          accountNumber: sql`excluded.account_number`,
          currentLateFee: sql`excluded.current_late_fee`,
          escrowBalance: sql`excluded.escrow_balance`,
          hasPmi: sql`excluded.has_pmi`,
          hasPrepaymentPenalty: sql`excluded.has_prepayment_penalty`,
          interestRate: sql`excluded.interest_rate`,
          lastPaymentAmount: sql`excluded.last_payment_amount`,
          lastPaymentDate: sql`excluded.last_payment_date`,
          loanTerm: sql`excluded.loan_term`,
          loanTypeDescription: sql`excluded.loan_type_description`,
          maturityDate: sql`excluded.maturity_date`,
          nextMonthlyPayment: sql`excluded.next_monthly_payment`,
          nextPaymentDueDate: sql`excluded.next_payment_due_date`,
          originationDate: sql`excluded.origination_date`,
          originationPrincipalAmount: sql`excluded.origination_principal_amount`,
          pastDueAmount: sql`excluded.past_due_amount`,
          propertyAddress: sql`excluded.property_address`,
          updatedAt: new Date(),
          ytdInterestPaid: sql`excluded.ytd_interest_paid`,
          ytdPrincipalPaid: sql`excluded.ytd_principal_paid`,
        },
        target: mortgageLiability.accountId,
      });
  }
}

export async function upsertStudentLoanLiabilities(
  loans: StudentLoan[]
): Promise<void> {
  if (loans.length === 0) {
    return;
  }

  const plaidAccountIds = [
    ...new Set(
      loans
        .map((l) => l.account_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];
  const accountMap = await lookupFinancialAccountsByPlaidIds(plaidAccountIds);

  const rows = loans
    .map((l) => {
      if (!l.account_id) {
        return null;
      }
      const acct = accountMap.get(l.account_id);
      if (!acct) {
        return null;
      }
      return {
        accountId: acct.id,
        accountNumber: l.account_number ?? null,
        disbursementDates: l.disbursement_dates ?? null,
        expectedPayoffDate: l.expected_payoff_date ?? null,
        guarantor: l.guarantor ?? null,
        interestRatePercentage: numToStr(l.interest_rate_percentage),
        isOverdue: l.is_overdue ?? null,
        lastPaymentAmount: numToStr(l.last_payment_amount),
        lastPaymentDate: l.last_payment_date ?? null,
        lastStatementBalance: numToStr(l.last_statement_balance),
        lastStatementIssueDate: l.last_statement_issue_date ?? null,
        loanName: l.loan_name ?? null,
        loanStatus: l.loan_status ?? null,
        minimumPaymentAmount: numToStr(l.minimum_payment_amount),
        nextPaymentDueDate: l.next_payment_due_date ?? null,
        originationDate: l.origination_date ?? null,
        originationPrincipalAmount: numToStr(l.origination_principal_amount),
        outstandingInterestAmount: numToStr(l.outstanding_interest_amount),
        paymentReferenceNumber: l.payment_reference_number ?? null,
        pslfStatus: l.pslf_status ?? null,
        repaymentPlan: l.repayment_plan ?? null,
        sequenceNumber: l.sequence_number ?? null,
        servicerAddress: l.servicer_address ?? null,
        userId: acct.userId,
        ytdInterestPaid: numToStr(l.ytd_interest_paid),
        ytdPrincipalPaid: numToStr(l.ytd_principal_paid),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(studentLoanLiability)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          accountNumber: sql`excluded.account_number`,
          disbursementDates: sql`excluded.disbursement_dates`,
          expectedPayoffDate: sql`excluded.expected_payoff_date`,
          guarantor: sql`excluded.guarantor`,
          interestRatePercentage: sql`excluded.interest_rate_percentage`,
          isOverdue: sql`excluded.is_overdue`,
          lastPaymentAmount: sql`excluded.last_payment_amount`,
          lastPaymentDate: sql`excluded.last_payment_date`,
          lastStatementBalance: sql`excluded.last_statement_balance`,
          lastStatementIssueDate: sql`excluded.last_statement_issue_date`,
          loanName: sql`excluded.loan_name`,
          loanStatus: sql`excluded.loan_status`,
          minimumPaymentAmount: sql`excluded.minimum_payment_amount`,
          nextPaymentDueDate: sql`excluded.next_payment_due_date`,
          originationDate: sql`excluded.origination_date`,
          originationPrincipalAmount: sql`excluded.origination_principal_amount`,
          outstandingInterestAmount: sql`excluded.outstanding_interest_amount`,
          paymentReferenceNumber: sql`excluded.payment_reference_number`,
          pslfStatus: sql`excluded.pslf_status`,
          repaymentPlan: sql`excluded.repayment_plan`,
          sequenceNumber: sql`excluded.sequence_number`,
          servicerAddress: sql`excluded.servicer_address`,
          updatedAt: new Date(),
          ytdInterestPaid: sql`excluded.ytd_interest_paid`,
          ytdPrincipalPaid: sql`excluded.ytd_principal_paid`,
        },
        target: studentLoanLiability.accountId,
      });
  }
}
