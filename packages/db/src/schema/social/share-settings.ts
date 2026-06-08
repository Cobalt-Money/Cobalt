import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Per-user share preferences. One row per user.
 *
 * Display bools = which fields are visible on shared posts.
 * Min/max cents = amount-range filter; txns outside range never reach social_post.
 *
 * Hardcoded write gate: in-store + lat/lon present. Range + blocklists layer on top.
 */
export const socialShareSettings = pgTable("social_share_settings", {
  shareAmount: boolean("share_amount").default(true).notNull(),
  shareCard: boolean("share_card").default(true).notNull(),
  shareDate: boolean("share_date").default(true).notNull(),
  shareMaxAmountCents: integer("share_max_amount_cents"),
  shareMerchant: boolean("share_merchant").default(true).notNull(),
  shareMinAmountCents: integer("share_min_amount_cents"),
  shareNote: boolean("share_note").default(false).notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
});
