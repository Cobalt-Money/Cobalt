import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../users/auth/auth";
import type { PlaidItemErrorJson, StringArrayJson } from "./zod";

export const plaidConnection = pgTable(
  "plaid_connection",
  {
    availableProducts: jsonb("available_products").$type<StringArrayJson>(),
    billedProducts: jsonb("billed_products").$type<StringArrayJson>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    error: jsonb("error").$type<PlaidItemErrorJson>(),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: text("institution_id"),
    institutionLogo: text("institution_logo"),
    institutionName: text("institution_name"),
    newAccountsAvailable: boolean("new_accounts_available")
      .default(false)
      .notNull(),
    pendingDisconnectAt: timestamp("pending_disconnect_at", {
      withTimezone: true,
    }),
    plaidAccessToken: text("plaid_access_token").notNull(),
    plaidItemId: text("plaid_item_id").notNull().unique(),
    recurringUpdatedDatetime: timestamp("recurring_updated_datetime", {
      withTimezone: true,
    }),
    transactionsCursor: text("transactions_cursor"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    webhookUrl: text("webhook_url"),
  },
  (t) => [
    index("plaid_connection_user_id_idx").on(t.userId),
    index("plaid_connection_institution_id_idx").on(t.institutionId),
    index("plaid_connection_user_institution_idx").on(
      t.userId,
      t.institutionId
    ),
  ]
);

export type PlaidConnection = typeof plaidConnection.$inferSelect;
export type PlaidConnectionInsert = typeof plaidConnection.$inferInsert;
