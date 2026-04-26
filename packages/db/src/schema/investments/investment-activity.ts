import { sql } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { financialAccount } from "../accounts/financial-account";
import { user } from "../auth/auth";
import { security } from "./security";

export const activitySource = pgEnum("activity_source", [
  "plaid",
  "snaptrade",
  "manual",
]);

export const investmentActivity = pgTable(
  "investment_activity",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    cancelTransactionId: text("cancel_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    date: date("date").notNull(),
    externalId: text("external_id"),
    externalReferenceId: text("external_reference_id"),
    fees: numeric("fees", { precision: 19, scale: 4 }),
    fxRate: numeric("fx_rate", { precision: 19, scale: 8 }),
    id: uuid("id").defaultRandom().primaryKey(),
    isoCurrencyCode: text("iso_currency_code"),
    name: text("name").notNull(),
    optionSymbol: text("option_symbol"),
    optionType: text("option_type"),
    price: numeric("price", { precision: 28, scale: 10 }),
    quantity: numeric("quantity", { precision: 28, scale: 10 }),
    securityId: uuid("security_id").references(() => security.id, {
      onDelete: "set null",
    }),
    settlementDate: date("settlement_date"),
    source: activitySource("source").notNull(),
    subtype: text("subtype"),
    type: text("type").notNull(),
    unofficialCurrencyCode: text("unofficial_currency_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("investment_activity_account_idx").on(t.accountId),
    index("investment_activity_user_idx").on(t.userId),
    index("investment_activity_date_idx").on(t.date),
    index("investment_activity_account_date_idx").on(t.accountId, t.date),
    index("investment_activity_security_idx").on(t.securityId),
    index("investment_activity_type_idx").on(t.type),
    uniqueIndex("investment_activity_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ]
);

export type InvestmentActivity = typeof investmentActivity.$inferSelect;
export type InvestmentActivityInsert = typeof investmentActivity.$inferInsert;
