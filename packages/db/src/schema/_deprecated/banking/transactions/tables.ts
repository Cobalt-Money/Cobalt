import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  CounterpartiesArrayJson,
  LocationJson,
  TransactionNotesJson,
  UserOverrideCategoryJson,
} from "../../../accounts/banking/transactions/zod";
import { appFullAccess, agentSelectViaBankAccount } from "../../../rls";
import { bankAccount } from "../accounts";

export type LegacyCategoryArrayJson = string[] | null;
export interface PersonalFinanceCategoryJson {
  primary: string;
  detailed: string;
  confidence_level?: string;
  version?: "v1" | "v2";
}
export interface PaymentMetaJson {
  by_order_of: string | null;
  payee: string | null;
  payer: string | null;
  payment_method: string | null;
  payment_processor: string | null;
  ppd_id: string | null;
  reason: string | null;
  reference_number: string | null;
}

// Transactions (posted and pending)
/** @deprecated Use `transaction` from `@cobalt-web/db/schema/accounts/transaction`. */
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
    notes: jsonb("notes").$type<TransactionNotesJson | null>(),
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
    userOverrideLocation: jsonb(
      "user_override_location"
    ).$type<LocationJson | null>(),
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

export type Transaction = typeof transaction.$inferInsert;
export type TransactionSelect = typeof transaction.$inferSelect;
