import {
  date,
  pgTable,
  text,
  varchar,
  timestamp,
  real,
  index,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bankConnection } from "./items/bank-connection";

// Bank Accounts (individual accounts within a connection)
export const bankAccount = pgTable(
  "bank_account",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    mask: text("mask"),
    name: text("name").notNull(),
    officialName: text("official_name"),
    plaidAccountId: text("plaid_account_id").notNull().unique(),
    plaidItemId: text("plaid_item_id")
      .notNull()
      .references(() => bankConnection.plaidItemId, { onDelete: "cascade" }),
    subtype: varchar("subtype"),
    type: varchar("type").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    verificationStatus: varchar("verification_status"),
  },
  (table) => [
    index("bank_account_connection_id_idx").on(table.plaidItemId),
    index("bank_account_connection_type_idx").on(table.plaidItemId, table.type),
  ]
);

// Bank Balances (latest balances per account)
export const bankBalance = pgTable(
  "bank_balance",
  {
    available: real("available"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    current: real("current").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isoCurrencyCode: varchar("iso_currency_code"),
    limit: real("limit"),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    unofficialCurrencyCode: varchar("unofficial_currency_code"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userOverrideCreditLimit: real("user_override_credit_limit"),
  },
  (table) => [
    index("bank_balance_account_id_idx").on(table.plaidAccountId),
    index("bank_balance_updated_at_idx").on(table.updatedAt),
    index("bank_balance_account_updated_idx").on(
      table.plaidAccountId,
      table.updatedAt
    ),
  ]
);

// Bank Balance Snapshots (historical daily balance records)
export const bankBalanceSnapshot = pgTable(
  "bank_balance_snapshot",
  {
    availableBalance: real("available_balance"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creditLimit: real("credit_limit"),
    currentBalance: real("current_balance").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    plaidAccountId: text("plaid_account_id")
      .notNull()
      .references(() => bankAccount.plaidAccountId, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    snapshotSource: varchar("snapshot_source").notNull(),
  },
  (table) => [
    index("bank_balance_snapshot_account_id_idx").on(table.plaidAccountId),
    index("bank_balance_snapshot_date_idx").on(table.snapshotDate),
    uniqueIndex("bank_balance_snapshot_account_date_idx").on(
      table.plaidAccountId,
      table.snapshotDate
    ),
  ]
);

// Type exports
export type BankAccount = typeof bankAccount.$inferInsert;
export type BankAccountSelect = typeof bankAccount.$inferSelect;
export type BankBalance = typeof bankBalance.$inferInsert;
export type BankBalanceSelect = typeof bankBalance.$inferSelect;
export type BankBalanceSnapshot = typeof bankBalanceSnapshot.$inferInsert;
export type BankBalanceSnapshotSelect = typeof bankBalanceSnapshot.$inferSelect;
