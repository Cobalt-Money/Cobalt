import {
  bigint,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { transaction } from "../accounts/banking/transactions/transaction";
import { user } from "../users/auth/auth";

/**
 * Shared transaction projection — the ONLY surface the friends app reads
 * for txn-derived content. Denormalized at share time so the raw transaction
 * row is never exposed.
 *
 * Display fields are nullable: a null column means user toggled that field
 * off in share settings at the time the row was written. lat/lon are
 * required (the in-store gate guarantees them) and not user-controllable.
 * Amount in cents (avoid float drift).
 *
 * One row per (user, transaction). createdAt is server-only — must be
 * stripped from Zero projection to avoid leaking timing.
 */
export const socialPost = pgTable(
  "social_post",
  {
    amountCents: bigint("amount_cents", { mode: "number" }),
    cardName: text("card_name"),
    categorySystemKey: text("category_system_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    date: timestamp("date"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionName: text("institution_name"),
    lat: doublePrecision("lat").notNull(),
    logoUrl: text("logo_url"),
    lon: doublePrecision("lon").notNull(),
    merchantName: text("merchant_name"),
    note: text("note"),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    website: text("website"),
  },
  (table) => [
    uniqueIndex("social_post_user_txn_uq").on(table.userId, table.transactionId),
    index("social_post_user_idx").on(table.userId),
    index("social_post_lat_lon_idx").on(table.lat, table.lon),
  ],
);
