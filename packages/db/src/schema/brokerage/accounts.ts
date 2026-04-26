import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { appFullAccess, agentSelectOwn } from "../rls";
import { brokerageAuthorizations } from "./auth";

/** @deprecated Use `financialAccount` from `@cobalt-web/db/schema/accounts/financial-account`. */
export const brokerageAccounts = pgTable.withRLS(
  "brokerage_account",
  {
    accountId: varchar("account_id").notNull().unique(),
    accountNumber: varchar("account_number"),
    accountStatus: varchar("account_status"),
    accountType: varchar("account_type"),
    balanceData: jsonb("balance_data"),
    brokerageAuthId: uuid("brokerage_auth_id")
      .references(() => brokerageAuthorizations.id, { onDelete: "cascade" })
      .notNull(),
    cashRestrictions: jsonb("cash_restrictions"),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    createdDate: timestamp("created_date"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionName: varchar("institution_name"),
    lastSync: timestamp("last_sync"),
    metaData: jsonb("meta_data"),
    name: varchar("name"),
    portfolioGroup: varchar("portfolio_group"),
    syncStatus: varchar("sync_status").$default(() => "pending"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_account_user_id_idx").on(table.userId),
    index("brokerage_account_brokerage_auth_id_idx").on(table.brokerageAuthId),
    index("brokerage_account_account_id_idx").on(table.accountId),
    index("brokerage_account_sync_status_idx").on(table.syncStatus),
    index("brokerage_account_account_status_idx").on(table.accountStatus),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

/** @deprecated Merged into `financialAccount` from `@cobalt-web/db/schema/accounts/financial-account`. */
export const brokerageAccountDetails = pgTable.withRLS(
  "brokerage_account_detail",
  {
    accountId: uuid("account_id")
      .references(() => brokerageAccounts.id, { onDelete: "cascade" })
      .notNull(),
    balance: jsonb("balance"),
    brokerageAuthorizationId: varchar("brokerage_authorization_id").notNull(),
    cashRestrictions: jsonb("cash_restrictions"),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    createdDate: timestamp("created_date"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionName: varchar("institution_name"),
    lastSync: timestamp("last_sync"),
    meta: jsonb("meta"),
    name: varchar("name"),
    number: varchar("number"),
    portfolioGroup: varchar("portfolio_group"),
    rawType: varchar("raw_type"),
    snapTradeAccountId: varchar("snaptrade_account_id").notNull().unique(),
    status: varchar("status"),
    syncStatus: jsonb("sync_status"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_account_detail_account_id_idx").on(table.accountId),
    index("brokerage_account_detail_user_id_idx").on(table.userId),
    index("brokerage_account_detail_snaptrade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    index("brokerage_account_detail_brokerage_authorization_id_idx").on(
      table.brokerageAuthorizationId
    ),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

// Type exports
export type BrokerageAccount = typeof brokerageAccounts.$inferSelect;
export type BrokerageAccountInsert = typeof brokerageAccounts.$inferInsert;
export type BrokerageAccountDetail =
  typeof brokerageAccountDetails.$inferSelect;
export type BrokerageAccountDetailInsert =
  typeof brokerageAccountDetails.$inferInsert;
