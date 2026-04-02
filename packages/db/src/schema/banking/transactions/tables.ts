import {
  date,
  pgTable,
  text,
  uuid,
  varchar,
  timestamp,
  jsonb,
  real,
  index,
  boolean,
} from "drizzle-orm/pg-core";

import { appFullAccess, agentSelectViaBankAccount } from "../../rls";
import { bankAccount } from "../accounts";
import type {
  CounterpartiesArrayJson,
  LegacyCategoryArrayJson,
  LocationJson,
  PaymentMetaJson,
  PersonalFinanceCategoryJson,
  RecurringTransactionIdsJson,
  UserOverrideCategoryJson,
} from "./zod";

// Transactions (posted and pending)
export const transaction = pgTable.withRLS(
  "transaction",
  {
    accountOwner: text("account_owner"),
    amount: real("amount").notNull(),
    authorizedDate: date("authorized_date"),

    authorizedDatetime: text("authorized_datetime"),
    category: jsonb("category").$type<LegacyCategoryArrayJson>(),
    categoryId: text("category_id"),
    checkNumber: text("check_number"),
    counterparties: jsonb("counterparties").$type<CounterpartiesArrayJson>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    date: date("date").notNull(),
    datetime: text("datetime"),
    id: uuid("id").defaultRandom().primaryKey(),
    isoCurrencyCode: varchar("iso_currency_code"),
    location: jsonb("location").$type<LocationJson | null>(),
    logoUrl: text("logo_url"),
    merchantEntityId: text("merchant_entity_id"),
    merchantName: text("merchant_name"),
    name: text("name").notNull(),
    originalDescription: text("original_description"),
    paymentChannel: varchar("payment_channel"),
    paymentMeta: jsonb("payment_meta").$type<PaymentMetaJson | null>(),
    pending: boolean("pending").default(false).notNull(),
    pendingTransactionId: text("pending_transaction_id"),
    personalFinanceCategory: jsonb(
      "personal_finance_category"
    ).$type<PersonalFinanceCategoryJson | null>(),
    personalFinanceCategoryIconUrl: text("personal_finance_category_icon_url"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
    transactionCode: text("transaction_code"),
    transactionType: varchar("transaction_type"),
    unofficialCurrencyCode: varchar("unofficial_currency_code"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userOverrideCategory: jsonb(
      "user_override_category"
    ).$type<UserOverrideCategoryJson | null>(),
    userOverrideDate: date("user_override_date"),
    userOverrideName: text("user_override_name"),
    website: text("website"),
  },
  (table) => [
    index("transaction_account_id_idx").on(table.plaidAccountId),
    index("transaction_date_idx").on(table.date),
    index("transaction_account_date_idx").on(table.plaidAccountId, table.date),
    index("transaction_pending_idx").on(table.pending),
    index("transaction_date_pending_idx").on(table.date, table.pending),
    appFullAccess(),
    agentSelectViaBankAccount(table.plaidAccountId),
  ]
);

// Recurring Transactions
export const recurringStream = pgTable.withRLS(
  "recurring_stream",
  {
    averageAmount: real("average_amount").notNull(),
    category: jsonb("category").$type<LegacyCategoryArrayJson>(),
    categoryId: text("category_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull(),
    firstDate: text("first_date").notNull(),

    frequency: varchar("frequency").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    isUserModified: boolean("is_user_modified").default(false).notNull(),

    lastAmount: real("last_amount").notNull(),
    lastDate: text("last_date").notNull(),
    lastUserModifiedDatetime: text("last_user_modified_datetime"),

    merchantName: text("merchant_name"),

    personalFinanceCategory: jsonb(
      "personal_finance_category"
    ).$type<PersonalFinanceCategoryJson | null>(),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),

    predictedNextDate: text("predicted_next_date"),

    status: varchar("status").notNull(),
    streamId: text("stream_id").notNull().unique(),

    streamType: varchar("stream_type").notNull(),
    transactionIds: jsonb("transaction_ids")
      .$type<RecurringTransactionIdsJson>()
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("recurring_stream_account_id_idx").on(table.plaidAccountId),
    index("recurring_stream_account_date_type_idx").on(
      table.plaidAccountId,
      table.lastDate,
      table.streamType
    ),
    appFullAccess(),
    agentSelectViaBankAccount(table.plaidAccountId),
  ]
);

export type Transaction = typeof transaction.$inferInsert;
export type TransactionSelect = typeof transaction.$inferSelect;
export type RecurringStream = typeof recurringStream.$inferInsert;
export type RecurringStreamSelect = typeof recurringStream.$inferSelect;
