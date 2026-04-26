import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import type {
  CounterpartiesArrayJson,
  LegacyCategoryArrayJson,
  LocationJson,
  PaymentMetaJson,
  PersonalFinanceCategoryJson,
  TransactionNotesJson,
  UserOverrideCategoryJson,
} from "../banking/transactions/zod";
import { transactionSource } from "./enums";
import { financialAccount } from "./financial-account";

export const transaction = pgTable(
  "transaction",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    accountOwner: text("account_owner"),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    authorizedDate: date("authorized_date"),
    authorizedDatetime: timestamp("authorized_datetime", {
      withTimezone: true,
    }),
    category: jsonb("category").$type<LegacyCategoryArrayJson>(),
    categoryId: text("category_id"),
    checkNumber: text("check_number"),
    counterparties: jsonb("counterparties").$type<CounterpartiesArrayJson>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    date: date("date").notNull(),
    datetime: timestamp("datetime", { withTimezone: true }),
    externalId: text("external_id"),
    id: uuid("id").defaultRandom().primaryKey(),
    isoCurrencyCode: text("iso_currency_code"),
    location: jsonb("location").$type<LocationJson | null>(),
    logoUrl: text("logo_url"),
    merchantEntityId: text("merchant_entity_id"),
    merchantName: text("merchant_name"),
    name: text("name").notNull(),
    notes: jsonb("notes").$type<TransactionNotesJson | null>(),
    originalDescription: text("original_description"),
    paymentChannel: text("payment_channel"),
    paymentMeta: jsonb("payment_meta").$type<PaymentMetaJson | null>(),
    pending: boolean("pending").default(false).notNull(),
    pendingTransactionId: text("pending_transaction_id"),
    personalFinanceCategory: jsonb(
      "personal_finance_category"
    ).$type<PersonalFinanceCategoryJson | null>(),
    personalFinanceCategoryIconUrl: text("personal_finance_category_icon_url"),
    source: transactionSource("source").notNull(),
    transactionCode: text("transaction_code"),
    transactionType: text("transaction_type"),
    unofficialCurrencyCode: text("unofficial_currency_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userOverrideCategory: jsonb(
      "user_override_category"
    ).$type<UserOverrideCategoryJson | null>(),
    userOverrideDate: date("user_override_date"),
    userOverrideLocation: jsonb(
      "user_override_location"
    ).$type<LocationJson | null>(),
    userOverrideName: text("user_override_name"),
    website: text("website"),
  },
  (t) => [
    index("transaction_account_id_idx").on(t.accountId),
    index("transaction_user_id_idx").on(t.userId),
    index("transaction_date_idx").on(t.date),
    index("transaction_account_date_idx").on(t.accountId, t.date),
    index("transaction_pending_idx").on(t.pending),
    index("transaction_date_pending_idx").on(t.date, t.pending),
    uniqueIndex("transaction_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ]
);

export type Transaction = typeof transaction.$inferSelect;
export type TransactionInsert = typeof transaction.$inferInsert;
