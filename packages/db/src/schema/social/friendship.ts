import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

/**
 * Mutual friendship between two users. One row per pair, stored with
 * `user_a_id < user_b_id` to enforce uniqueness across both orderings.
 * Lookup helper: `areFriends(x, y)` queries by `(min(x,y), max(x,y))`.
 *
 * No directional follow primitive in v1 — invite redemption creates a row,
 * either user deleting it ends the relationship for both sides.
 */
export const socialFriendship = pgTable(
  "social_friendship",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    userAId: text("user_a_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userBId: text("user_b_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("social_friendship_pair_uq").on(table.userAId, table.userBId),
    index("social_friendship_user_a_idx").on(table.userAId),
    index("social_friendship_user_b_idx").on(table.userBId),
    check("social_friendship_sorted_chk", sql`${table.userAId} < ${table.userBId}`),
  ],
);
