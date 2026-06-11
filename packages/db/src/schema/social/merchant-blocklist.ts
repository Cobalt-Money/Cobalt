import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Per-user merchant denylist. Presence = blocked. Empty = share all.
 * Matched case-insensitively on `transaction.merchant_name` at write time.
 */
export const socialMerchantBlocklist = pgTable(
  "social_merchant_blocklist",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    merchantName: text("merchant_name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.merchantName] })],
);
