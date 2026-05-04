import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../users/auth/auth";
import { financialAccount } from "../../account";
import { category } from "../categories/category";
import type { CounterpartiesArrayJson, LocationJson } from "./zod";

export const transactionSource = pgEnum("transaction_source", ["plaid", "manual"]);

export const transaction = pgTable(
  "transaction",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    /** Sub-account holder; usually card last-4 on shared cards. */
    accountOwner: text("account_owner"),
    /** Merchant address line. */
    address: text("address"),
    /** Charge amount; sign convention follows Plaid (debit positive). */
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    /** Card-swipe / authorization date; precedes posted `date`. */
    authorizedDate: date("authorized_date"),
    /** SRI-311: FK to user's category row. Resolved via PFC mapping or user override. */
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "restrict",
    }),
    /** Check number for paper checks. */
    checkNumber: text("check_number"),
    /** Merchant city. */
    city: text("city"),
    /** Plaid counterparties: merchant + marketplace/payment_app/POS/etc. */
    counterparties: jsonb("counterparties").$type<CounterpartiesArrayJson>(),
    /** Merchant ISO country code. */
    country: text("country"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /** ISO-4217 currency code (e.g. USD). */
    currency: text("currency"),
    /** Posted date when the bank settled the charge. */
    date: date("date").notNull(),
    /** Per-tx override of category.excludeFromInsights. */
    excluded: boolean("excluded").default(false).notNull(),
    /** Provider's transaction ID; for upsert dedupe via (source, external_id). */
    externalId: text("external_id"),
    id: uuid("id").defaultRandom().primaryKey(),
    /** Merchant latitude (degrees). */
    lat: doublePrecision("lat"),
    /** Plaid merchant logo URL. */
    lockedFields: jsonb("locked_fields")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    logoUrl: text("logo_url"),
    /** Merchant longitude (degrees). */
    lon: doublePrecision("lon"),
    /** Plaid stable opaque merchant key; for cross-row merchant grouping. */
    merchantEntityId: text("merchant_entity_id"),
    /** Plaid-normalized merchant name (e.g. "Starbucks"). */
    merchantName: text("merchant_name"),
    /** Raw bank description (e.g. "STARBUCKS #1234"). */
    name: text("name").notNull(),
    /** User-authored markdown notes (Milkdown). */
    notes: text("notes"),
    /** online | in_store | other. */
    paymentChannel: text("payment_channel"),
    /** True if not yet settled. */
    pending: boolean("pending").default(false).notNull(),
    /** ExternalId of the linked pending row once posted (Plaid only). */
    pendingTransactionId: text("pending_transaction_id"),
    /** Merchant postal/ZIP code. */
    postalCode: text("postal_code"),
    /** Merchant region/state. */
    region: text("region"),
    /** plaid | manual. */
    source: transactionSource("source").notNull(),
    /** Merchant store number / branch identifier. */
    storeNumber: text("store_number"),
    /** ACH/wire/check ISO transaction code. */
    transactionCode: text("transaction_code"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** User-edited location override; wins over flat lat/lon/address columns. */
    userOverrideLocation: jsonb("user_override_location").$type<LocationJson | null>(),
    /** Plaid merchant website. */
    website: text("website"),
    /** Fields the user has explicitly edited; Plaid sync skips these on upsert. */
  },
  (t) => [
    index("transaction_account_id_idx").on(t.accountId),
    index("transaction_category_id_idx").on(t.categoryId),
    index("transaction_user_id_idx").on(t.userId),
    index("transaction_date_idx").on(t.date),
    index("transaction_account_date_idx").on(t.accountId, t.date),
    index("transaction_pending_idx").on(t.pending),
    index("transaction_date_pending_idx").on(t.date, t.pending),
    uniqueIndex("transaction_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ],
);

export type Transaction = typeof transaction.$inferSelect;
export type TransactionInsert = typeof transaction.$inferInsert;
