import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { PlaidItemErrorJson, StringArrayJson } from "../../../providers/plaid/zod";
import { appFullAccess, agentSelectOwn } from "../../../rls";
import { user } from "../../../users/auth/auth";

/** @deprecated Use `plaidConnection` from `@cobalt-web/db/schema/providers/plaid/connection`. */
export const bankConnection = pgTable.withRLS(
  "bank_connection",
  {
    availableProducts: jsonb("available_products").$type<StringArrayJson>(),
    billedProducts: jsonb("billed_products").$type<StringArrayJson>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    error: jsonb("error").$type<PlaidItemErrorJson>(),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: text("institution_id"),
    institutionLogo: text("institution_logo"),
    institutionName: text("institution_name"),
    newAccountsAvailable: boolean("new_accounts_available").default(false).notNull(),
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
    index("bank_connection_user_institution_idx").on(table.userId, table.institutionId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ],
);

export type BankConnection = typeof bankConnection.$inferInsert;
export type BankConnectionSelect = typeof bankConnection.$inferSelect;
