import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../users/auth/auth";
import { categoryGroup } from "./category-group";

export const category = pgTable(
  "category",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    /** Default insight exclusion (transfers, investments). Per-tx override on transaction.excluded. */
    excludeFromInsights: boolean("exclude_from_insights")
      .default(false)
      .notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => categoryGroup.id, { onDelete: "restrict" }),
    /** Hidden from picker; existing rows still display historically. */
    hidden: boolean("hidden").default(false).notNull(),
    /** Curated icon set key; references @cobalt-web/ui icon registry. */
    iconKey: text("icon_key").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    /** User-mutable display name. */
    name: text("name").notNull(),
    /** Display order within group. */
    order: integer("order").default(0).notNull(),
    /** Stable identifier for seeded system cats; null = user-created custom. */
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
    index("category_user_id_idx").on(t.userId),
    index("category_group_id_idx").on(t.groupId),
    index("category_user_active_idx")
      .on(t.userId)
      .where(sql`deleted_at IS NULL`),
    uniqueIndex("category_user_system_key_idx")
      .on(t.userId, t.systemKey)
      .where(sql`system_key IS NOT NULL`),
  ]
);

export type Category = typeof category.$inferSelect;
export type CategoryInsert = typeof category.$inferInsert;
