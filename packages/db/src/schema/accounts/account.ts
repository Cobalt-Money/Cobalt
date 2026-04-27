import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { plaidConnection } from "../providers/plaid/connection";
import { snaptradeAuthorization } from "../providers/snaptrade/authorization";
import { user } from "../users/auth/auth";

export const accountSource = pgEnum("account_source", [
  "plaid",
  "snaptrade",
  "manual",
]);

export const financialAccount = pgTable(
  "financial_account",
  {
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    externalId: text("external_id"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionName: text("institution_name"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    mask: text("mask"),
    name: text("name").notNull(),
    officialName: text("official_name"),
    persistentAccountId: text("persistent_account_id"),
    plaidConnectionId: uuid("plaid_connection_id").references(
      () => plaidConnection.id,
      { onDelete: "cascade" }
    ),
    portfolioGroup: text("portfolio_group"),
    providerCreatedAt: timestamp("provider_created_at", { withTimezone: true }),
    snaptradeAuthorizationId: uuid("snaptrade_authorization_id").references(
      () => snaptradeAuthorization.id,
      { onDelete: "cascade" }
    ),
    source: accountSource("source").notNull(),
    status: text("status"),
    subtype: text("subtype"),
    syncStatus: text("sync_status"),
    type: text("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userOverrideCreditLimit: numeric("user_override_credit_limit", {
      precision: 19,
      scale: 4,
    }),
    verificationStatus: text("verification_status"),
  },
  (t) => [
    index("financial_account_user_id_idx").on(t.userId),
    index("financial_account_user_type_idx").on(t.userId, t.type),
    index("financial_account_plaid_connection_id_idx").on(t.plaidConnectionId),
    index("financial_account_snaptrade_auth_id_idx").on(
      t.snaptradeAuthorizationId
    ),
    index("financial_account_persistent_id_idx").on(t.persistentAccountId),
    uniqueIndex("financial_account_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
    check(
      "financial_account_connection_arc",
      sql`num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1`
    ),
  ]
);

export type FinancialAccount = typeof financialAccount.$inferSelect;
export type FinancialAccountInsert = typeof financialAccount.$inferInsert;
