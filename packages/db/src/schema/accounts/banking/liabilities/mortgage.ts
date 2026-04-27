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

import { user } from "../../../users/auth/auth";
import { financialAccount } from "../../account";

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

export type MortgageLiability = typeof mortgageLiability.$inferSelect;
export type MortgageLiabilityInsert = typeof mortgageLiability.$inferInsert;
