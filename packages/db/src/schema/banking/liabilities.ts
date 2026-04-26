import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  real,
  boolean,
} from "drizzle-orm/pg-core";

import { appFullAccess, agentSelectViaBankAccount } from "../rls";
import { bankAccount } from "./accounts";

// Credit Card Liabilities
/** @deprecated Use `creditLiability` from `@cobalt-web/db/schema/accounts/liabilities`. */
export const creditLiability = pgTable.withRLS(
  "credit_liability",
  {
    aprs: jsonb("aprs"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isOverdue: boolean("is_overdue").default(false).notNull(),
    lastPaymentAmount: real("last_payment_amount"),
    lastPaymentDate: text("last_payment_date"),
    lastStatementBalance: real("last_statement_balance"),
    lastStatementIssueDate: text("last_statement_issue_date"),
    minimumPaymentAmount: real("minimum_payment_amount"),
    nextPaymentDueDate: text("next_payment_due_date"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .unique()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [appFullAccess(), agentSelectViaBankAccount(table.plaidAccountId)]
);

// Mortgage Liabilities
/** @deprecated Use `mortgageLiability` from `@cobalt-web/db/schema/accounts/liabilities`. */
export const mortgageLiability = pgTable.withRLS(
  "mortgage_liability",
  {
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    currentLateFee: real("current_late_fee"),
    escrowBalance: real("escrow_balance"),
    hasPmi: boolean("has_pmi"),
    hasPrepaymentPenalty: boolean("has_prepayment_penalty"),
    id: uuid("id").defaultRandom().primaryKey(),
    interestRate: jsonb("interest_rate"),
    lastPaymentAmount: real("last_payment_amount"),
    lastPaymentDate: text("last_payment_date"),
    loanTerm: text("loan_term"),
    loanTypeDescription: text("loan_type_description"),
    maturityDate: text("maturity_date"),
    nextMonthlyPayment: real("next_monthly_payment"),
    nextPaymentDueDate: text("next_payment_due_date"),
    originationDate: text("origination_date"),
    originationPrincipalAmount: real("origination_principal_amount"),
    pastDueAmount: real("past_due_amount"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .unique()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    propertyAddress: jsonb("property_address"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    ytdInterestPaid: real("ytd_interest_paid"),
    ytdPrincipalPaid: real("ytd_principal_paid"),
  },
  (table) => [appFullAccess(), agentSelectViaBankAccount(table.plaidAccountId)]
);

// Student Loan Liabilities
/** @deprecated Use `studentLoanLiability` from `@cobalt-web/db/schema/accounts/liabilities`. */
export const studentLoanLiability = pgTable.withRLS(
  "student_loan_liability",
  {
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    disbursementDates: jsonb("disbursement_dates").$type<string[] | null>(),
    expectedPayoffDate: text("expected_payoff_date"),
    guarantor: text("guarantor"),
    id: uuid("id").defaultRandom().primaryKey(),
    interestRatePercentage: real("interest_rate_percentage"),
    isOverdue: boolean("is_overdue"),
    lastPaymentAmount: real("last_payment_amount"),
    lastPaymentDate: text("last_payment_date"),
    lastStatementBalance: real("last_statement_balance"),
    lastStatementIssueDate: text("last_statement_issue_date"),
    loanName: text("loan_name"),
    loanStatus: jsonb("loan_status"),
    minimumPaymentAmount: real("minimum_payment_amount"),
    nextPaymentDueDate: text("next_payment_due_date"),
    originationDate: text("origination_date"),
    originationPrincipalAmount: real("origination_principal_amount"),
    outstandingInterestAmount: real("outstanding_interest_amount"),
    paymentReferenceNumber: text("payment_reference_number"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .unique()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    pslfStatus: jsonb("pslf_status"),
    repaymentPlan: jsonb("repayment_plan"),
    sequenceNumber: text("sequence_number"),
    servicerAddress: jsonb("servicer_address"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    ytdInterestPaid: real("ytd_interest_paid"),
    ytdPrincipalPaid: real("ytd_principal_paid"),
  },
  (table) => [appFullAccess(), agentSelectViaBankAccount(table.plaidAccountId)]
);

// Type exports
export type CreditLiability = typeof creditLiability.$inferInsert;
export type CreditLiabilitySelect = typeof creditLiability.$inferSelect;
export type MortgageLiability = typeof mortgageLiability.$inferInsert;
export type MortgageLiabilitySelect = typeof mortgageLiability.$inferSelect;
export type StudentLoanLiability = typeof studentLoanLiability.$inferInsert;
export type StudentLoanLiabilitySelect =
  typeof studentLoanLiability.$inferSelect;
