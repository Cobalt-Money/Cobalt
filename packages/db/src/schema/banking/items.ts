import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";

// Institutions (store institution details and logos)
export const institution = pgTable(
  "institution",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    logo: text("logo"),
    name: text("name").notNull(),
    oauth: boolean("oauth").default(false).notNull(),
    plaidInstitutionId: text("plaid_institution_id").notNull().unique(),
    primaryColor: text("primary_color"),
    routingNumbers: jsonb("routing_numbers").$type<string[]>(),
    status: text("status"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    url: text("url"),
  },
  (table) => [
    index("institution_provider_id_idx").on(table.plaidInstitutionId),
    index("institution_name_idx").on(table.name),
  ]
);

// Bank Connections (one row per bank connection)
export const bankConnection = pgTable(
  "bank_connection",
  {
    availableProducts: jsonb("available_products").$type<string[]>(),
    billedProducts: jsonb("billed_products").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    error: jsonb("error"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: text("institution_id"),
    institutionLogo: text("institution_logo"),
    institutionName: text("institution_name"),
    newAccountsAvailable: boolean("new_accounts_available")
      .default(false)
      .notNull(),
    pendingDisconnectAt: timestamp("pending_disconnect_at"),
    plaidAccessToken: text("plaid_access_token").notNull(),
    plaidItemId: text("plaid_item_id").notNull().unique(),
    recurringUpdatedDatetime: text("recurring_updated_datetime"),
    transactionsCursor: text("transactions_cursor"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    webhookUrl: text("webhook_url"),
  },
  (table) => [
    index("bank_connection_institution_id_idx").on(table.institutionId),
    index("bank_connection_user_institution_idx").on(
      table.userId,
      table.institutionId
    ),
  ]
);

// Type exports
export type Institution = typeof institution.$inferInsert;
export type InstitutionSelect = typeof institution.$inferSelect;
export type BankConnection = typeof bankConnection.$inferInsert;
export type BankConnectionSelect = typeof bankConnection.$inferSelect;
