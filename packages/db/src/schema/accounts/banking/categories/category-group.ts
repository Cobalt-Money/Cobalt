import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../users/auth/auth";

export const categoryGroup = pgTable(
  "category_group",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    id: uuid("id").defaultRandom().primaryKey(),
    /** User-mutable display name. */
    name: text("name").notNull(),
    /** Display order within the user's group list. */
    order: integer("order").default(0).notNull(),
    /** Stable identifier for seeded system groups; null = user-created custom. */
    systemKey: text("system_key"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("category_group_user_id_idx").on(t.userId),
    index("category_group_user_active_idx")
      .on(t.userId)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex("category_group_user_system_key_idx")
      .on(t.userId, t.systemKey)
      .where(sql`system_key IS NOT NULL`),
  ]
);

export type CategoryGroup = typeof categoryGroup.$inferSelect;
export type CategoryGroupInsert = typeof categoryGroup.$inferInsert;
