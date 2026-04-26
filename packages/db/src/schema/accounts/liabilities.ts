import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { financialAccount } from "./financial-account";

export const creditLiability = pgTable(
  "credit_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    aprs: jsonb("aprs"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isOverdue: boolean("is_overdue").default(false).notNull(),
    lastPaymentAmount: numeric("last_payment_amount", {
      precision: 19,
      scale: 4,
    }),
    lastPaymentDate: date("last_payment_date"),
    lastStatementBalance: numeric("last_statement_balance", {
      precision: 19,
      scale: 4,
    }),
    lastStatementIssueDate: date("last_statement_issue_date"),
    minimumPaymentAmount: numeric("minimum_payment_amount", {
      precision: 19,
      scale: 4,
    }),
    nextPaymentDueDate: date("next_payment_due_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("credit_liability_user_id_idx").on(t.userId)]
);

export const mortgageLiability = pgTable(
  "mortgage_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currentLateFee: numeric("current_late_fee", { precision: 19, scale: 4 }),
    escrowBalance: numeric("escrow_balance", { precision: 19, scale: 4 }),
    hasPmi: boolean("has_pmi"),
    hasPrepaymentPenalty: boolean("has_prepayment_penalty"),
    id: uuid("id").defaultRandom().primaryKey(),
    interestRate: jsonb("interest_rate"),
    lastPaymentAmount: numeric("last_payment_amount", {
      precision: 19,
      scale: 4,
    }),
    lastPaymentDate: date("last_payment_date"),
    loanTerm: text("loan_term"),
    loanTypeDescription: text("loan_type_description"),
    maturityDate: date("maturity_date"),
    nextMonthlyPayment: numeric("next_monthly_payment", {
      precision: 19,
      scale: 4,
    }),
    nextPaymentDueDate: date("next_payment_due_date"),
    originationDate: date("origination_date"),
    originationPrincipalAmount: numeric("origination_principal_amount", {
      precision: 19,
      scale: 4,
    }),
    pastDueAmount: numeric("past_due_amount", { precision: 19, scale: 4 }),
    propertyAddress: jsonb("property_address"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ytdInterestPaid: numeric("ytd_interest_paid", { precision: 19, scale: 4 }),
    ytdPrincipalPaid: numeric("ytd_principal_paid", {
      precision: 19,
      scale: 4,
    }),
  },
  (t) => [index("mortgage_liability_user_id_idx").on(t.userId)]
);

export const studentLoanLiability = pgTable(
  "student_loan_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    disbursementDates: jsonb("disbursement_dates").$type<string[] | null>(),
    expectedPayoffDate: date("expected_payoff_date"),
    guarantor: text("guarantor"),
    id: uuid("id").defaultRandom().primaryKey(),
    interestRatePercentage: numeric("interest_rate_percentage", {
      precision: 9,
      scale: 6,
    }),
    isOverdue: boolean("is_overdue"),
    lastPaymentAmount: numeric("last_payment_amount", {
      precision: 19,
      scale: 4,
    }),
    lastPaymentDate: date("last_payment_date"),
    lastStatementBalance: numeric("last_statement_balance", {
      precision: 19,
      scale: 4,
    }),
    lastStatementIssueDate: date("last_statement_issue_date"),
    loanName: text("loan_name"),
    loanStatus: jsonb("loan_status"),
    minimumPaymentAmount: numeric("minimum_payment_amount", {
      precision: 19,
      scale: 4,
    }),
    nextPaymentDueDate: date("next_payment_due_date"),
    originationDate: date("origination_date"),
    originationPrincipalAmount: numeric("origination_principal_amount", {
      precision: 19,
      scale: 4,
    }),
    outstandingInterestAmount: numeric("outstanding_interest_amount", {
      precision: 19,
      scale: 4,
    }),
    paymentReferenceNumber: text("payment_reference_number"),
    pslfStatus: jsonb("pslf_status"),
    repaymentPlan: jsonb("repayment_plan"),
    sequenceNumber: text("sequence_number"),
    servicerAddress: jsonb("servicer_address"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ytdInterestPaid: numeric("ytd_interest_paid", { precision: 19, scale: 4 }),
    ytdPrincipalPaid: numeric("ytd_principal_paid", {
      precision: 19,
      scale: 4,
    }),
  },
  (t) => [index("student_loan_liability_user_id_idx").on(t.userId)]
);

export type CreditLiability = typeof creditLiability.$inferSelect;
export type CreditLiabilityInsert = typeof creditLiability.$inferInsert;
export type MortgageLiability = typeof mortgageLiability.$inferSelect;
export type MortgageLiabilityInsert = typeof mortgageLiability.$inferInsert;
export type StudentLoanLiability = typeof studentLoanLiability.$inferSelect;
export type StudentLoanLiabilityInsert =
  typeof studentLoanLiability.$inferInsert;
