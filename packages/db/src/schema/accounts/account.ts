import { sql } from "drizzle-orm";
import {
  check,
  index,
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

export const accountSource = pgEnum("account_source", ["plaid", "snaptrade", "manual"]);

export const financialAccount = pgTable(
  "financial_account",
  {
    /** Full account number; rarely populated by providers. */
    accountNumber: text("account_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** User-edited display name override. Plaid sync never writes this. Falls back to `name` when null. */
    customName: text("custom_name"),
    /** Provider's account ID (Plaid account_id / SnapTrade account id). */
    externalId: text("external_id"),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Bank/brokerage display name (denormalized from institution). */
    institutionName: text("institution_name"),
    /**
     * Brandfetch domain (e.g. "chase.com"). UI builds CDN URL from this — themeable, resizable.
     * Populated for manual accounts via Brandfetch typeahead; Plaid/SnapTrade fall back to lettermark.
     */
    logoDomain: text("logo_domain"),
    /** Last 4 digits of the account number. */
    mask: text("mask"),
    /** Short user-facing name (e.g. "Sapphire Reserve"). */
    name: text("name").notNull(),
    /** Verbose marketing name (e.g. "Chase Sapphire Reserve Visa Signature"). */
    officialName: text("official_name"),
    /** Plaid stable cross-Item ID for this account. */
    persistentAccountId: text("persistent_account_id"),
    plaidConnectionId: uuid("plaid_connection_id").references(() => plaidConnection.id, {
      onDelete: "cascade",
    }),
    /**
     * SnapTrade portfolio grouping label.
     * @deprecated Field deprecated upstream by SnapTrade; kept for read compatibility.
     */
    portfolioGroup: text("portfolio_group"),
    snaptradeAuthorizationId: uuid("snaptrade_authorization_id").references(
      () => snaptradeAuthorization.id,
      { onDelete: "cascade" },
    ),
    /** Provider: plaid | snaptrade | manual. */
    source: accountSource("source").notNull(),
    /** SnapTrade account status string (e.g. "active"). */
    status: text("status"),
    /** Granular type: checking, roth_ira, mortgage, etc. */
    subtype: text("subtype"),
    /** High-level: depository | credit | investment | loan. */
    type: text("type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("financial_account_user_id_idx").on(t.userId),
    index("financial_account_user_type_idx").on(t.userId, t.type),
    index("financial_account_plaid_connection_id_idx").on(t.plaidConnectionId),
    index("financial_account_snaptrade_auth_id_idx").on(t.snaptradeAuthorizationId),
    index("financial_account_persistent_id_idx").on(t.persistentAccountId),
    uniqueIndex("financial_account_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
    check(
      "financial_account_connection_arc",
      sql`num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1`,
    ),
  ],
);

export type FinancialAccount = typeof financialAccount.$inferSelect;
export type FinancialAccountInsert = typeof financialAccount.$inferInsert;
