import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Per-user category denylist. Presence = blocked. Empty = share all.
 * Matched on `transaction.category` (Plaid primary category name) at write time.
 */
export const socialCategoryBlocklist = pgTable(
  "social_category_blocklist",
  {
    category: text("category").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
);
