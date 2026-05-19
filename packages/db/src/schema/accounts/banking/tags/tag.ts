import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { TAG_COLORS } from "../../../../tag-palette";
import { user } from "../../../users/auth/auth";

const TAG_COLOR_LIST_SQL = sql.raw(TAG_COLORS.map((c) => `'${c}'`).join(", "));

export const tag = pgTable(
  "tag",
  {
    /** User-defined tag name; unique per-user case-insensitive. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    /** Member of the fixed palette in `@cobalt-web/ui/cobalt/transactions/tags/palette`. */
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("tag_user_id_lower_name_idx").on(t.userId, sql`lower(${t.name})`),
    index("tag_user_id_active_idx")
      .on(t.userId)
      .where(sql`archived_at IS NULL`),
    check("tag_name_length_check", sql`length(${t.name}) <= 50`),
    check("tag_color_check", sql`${t.color} IN (${TAG_COLOR_LIST_SQL})`),
  ],
);

export type Tag = typeof tag.$inferSelect;
export type TagInsert = typeof tag.$inferInsert;
