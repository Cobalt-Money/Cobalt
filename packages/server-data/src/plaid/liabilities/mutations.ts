import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalance,
  creditLiability,
  mortgageLiability,
  studentLoanLiability,
} from "@cobalt-web/db/schema/banking";
import type { InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 100;

type BankAccountInsert = InferInsertModel<typeof bankAccount>;
type BankBalanceInsert = InferInsertModel<typeof bankBalance>;
type CreditLiabilityInsert = InferInsertModel<typeof creditLiability>;
type MortgageLiabilityInsert = InferInsertModel<typeof mortgageLiability>;
type StudentLoanLiabilityInsert = InferInsertModel<typeof studentLoanLiability>;

/** Insert-only for liability-linked Plaid accounts; skips existing `plaid_account_id`. */
export async function insertBankAccountsOnConflictDoNothing(
  rows: BankAccountInsert[]
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  let inserted = 0;
  for (const row of rows) {
    const result = await db
      .insert(bankAccount)
      .values(row)
      .onConflictDoNothing({ target: bankAccount.plaidAccountId })
      .returning({ id: bankAccount.id });

    if (result.length > 0) {
      inserted += 1;
    }
  }

  return inserted;
}

/**
 * One balance row per `plaid_account_id` (no unique constraint — match-first upsert).
 */
export async function upsertBankBalancesForPlaidAccounts(
  rows: BankBalanceInsert[]
): Promise<void> {
  for (const row of rows) {
    const existing = await db
      .select()
      .from(bankBalance)
      .where(eq(bankBalance.plaidAccountId, row.plaidAccountId))
      .limit(1);

    const balanceData = {
      available: row.available ?? null,
      current: row.current,
      isoCurrencyCode: row.isoCurrencyCode ?? null,
      limit: row.limit ?? null,
      plaidAccountId: row.plaidAccountId,
      unofficialCurrencyCode: row.unofficialCurrencyCode ?? null,
    };

    await (existing.length > 0
      ? db
          .update(bankBalance)
          .set({ ...balanceData, updatedAt: new Date() })
          .where(eq(bankBalance.plaidAccountId, row.plaidAccountId))
      : db.insert(bankBalance).values(row));
  }
}

export async function upsertCreditLiabilities(
  rows: CreditLiabilityInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

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
        target: creditLiability.plaidAccountId,
      });
  }
}

export async function upsertMortgageLiabilities(
  rows: MortgageLiabilityInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

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
        target: mortgageLiability.plaidAccountId,
      });
  }
}

export async function upsertStudentLoanLiabilities(
  rows: StudentLoanLiabilityInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

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
        target: studentLoanLiability.plaidAccountId,
      });
  }
}
