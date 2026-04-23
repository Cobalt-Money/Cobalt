import type { BankAccount, BankBalance } from "@cobalt-web/db/schema/banking";
import type {
  AccountBase,
  CreditCardLiability,
  MortgageLiability,
  StudentLoan,
} from "plaid";

export function mapPlaidLiabilityBankAccount(
  account: AccountBase,
  plaidItemId: string
): BankAccount {
  return {
    mask: account.mask ?? null,
    name: account.name || account.official_name || "Account",
    officialName: account.official_name ?? null,
    persistentAccountId: account.persistent_account_id ?? null,
    plaidAccountId: account.account_id,
    plaidItemId,
    subtype: account.subtype ?? null,
    type: account.type,
    verificationStatus: (account.verification_status as string) ?? null,
  };
}

export function mapPlaidLiabilityBankBalance(
  account: AccountBase
): BankBalance {
  return {
    available: account.balances.available ?? null,
    current: account.balances.current ?? 0,
    isoCurrencyCode: account.balances.iso_currency_code ?? null,
    limit: account.balances.limit ?? null,
    plaidAccountId: account.account_id,
    unofficialCurrencyCode: account.balances.unofficial_currency_code ?? null,
  };
}

export function mapCreditLiability(l: CreditCardLiability) {
  return {
    aprs: l.aprs ?? null,
    isOverdue: l.is_overdue ?? false,
    lastPaymentAmount: l.last_payment_amount ?? null,
    lastPaymentDate: l.last_payment_date ?? null,
    lastStatementBalance: l.last_statement_balance ?? null,
    lastStatementIssueDate: l.last_statement_issue_date ?? null,
    minimumPaymentAmount: l.minimum_payment_amount ?? null,
    nextPaymentDueDate: l.next_payment_due_date ?? null,
    plaidAccountId: l.account_id ?? "",
  };
}

export function mapMortgageLiability(l: MortgageLiability) {
  return {
    accountNumber: l.account_number ?? null,
    currentLateFee: l.current_late_fee ?? null,
    escrowBalance: l.escrow_balance ?? null,
    hasPmi: l.has_pmi ?? null,
    hasPrepaymentPenalty: l.has_prepayment_penalty ?? null,
    interestRate: l.interest_rate ?? null,
    lastPaymentAmount: l.last_payment_amount ?? null,
    lastPaymentDate: l.last_payment_date ?? null,
    loanTerm: l.loan_term ?? null,
    loanTypeDescription: l.loan_type_description ?? null,
    maturityDate: l.maturity_date ?? null,
    nextMonthlyPayment: l.next_monthly_payment ?? null,
    nextPaymentDueDate: l.next_payment_due_date ?? null,
    originationDate: l.origination_date ?? null,
    originationPrincipalAmount: l.origination_principal_amount ?? null,
    pastDueAmount: l.past_due_amount ?? null,
    plaidAccountId: l.account_id,
    propertyAddress: l.property_address ?? null,
    ytdInterestPaid: l.ytd_interest_paid ?? null,
    ytdPrincipalPaid: l.ytd_principal_paid ?? null,
  };
}

function mapStudentLoanCore(l: StudentLoan) {
  return {
    accountNumber: l.account_number ?? null,
    disbursementDates: l.disbursement_dates ?? null,
    expectedPayoffDate: l.expected_payoff_date ?? null,
    guarantor: l.guarantor ?? null,
    interestRatePercentage: l.interest_rate_percentage,
    isOverdue: l.is_overdue ?? null,
    lastPaymentAmount: l.last_payment_amount ?? null,
    lastPaymentDate: l.last_payment_date ?? null,
    lastStatementBalance: l.last_statement_balance ?? null,
    lastStatementIssueDate: l.last_statement_issue_date ?? null,
    plaidAccountId: l.account_id ?? "",
  };
}

function mapStudentLoanMeta(l: StudentLoan) {
  return {
    loanName: l.loan_name ?? null,
    loanStatus: l.loan_status ?? null,
    minimumPaymentAmount: l.minimum_payment_amount ?? null,
    nextPaymentDueDate: l.next_payment_due_date ?? null,
    originationDate: l.origination_date ?? null,
    originationPrincipalAmount: l.origination_principal_amount ?? null,
    outstandingInterestAmount: l.outstanding_interest_amount ?? null,
    paymentReferenceNumber: l.payment_reference_number ?? null,
    pslfStatus: l.pslf_status ?? null,
    repaymentPlan: l.repayment_plan ?? null,
    sequenceNumber: l.sequence_number ?? null,
    servicerAddress: l.servicer_address ?? null,
    ytdInterestPaid: l.ytd_interest_paid ?? null,
    ytdPrincipalPaid: l.ytd_principal_paid ?? null,
  };
}

export function mapStudentLoan(l: StudentLoan) {
  return { ...mapStudentLoanCore(l), ...mapStudentLoanMeta(l) };
}
