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

export const creditLiability = pgTable(
  "credit_liability",
  {
    accountId: uuid("account_id")
      .notNull()
      .unique()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    aprs: jsonb("aprs"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
  (t) => [index("credit_liability_user_id_idx").on(t.userId)],
);

export type CreditLiability = typeof creditLiability.$inferSelect;
export type CreditLiabilityInsert = typeof creditLiability.$inferInsert;
