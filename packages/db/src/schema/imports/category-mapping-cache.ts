import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { category } from "../accounts/banking/categories/category";
import { user } from "../users/auth/auth";

/**
 * Per-user cache of confirmed source-category-label → Cobalt category choices.
 * `action` records what was done so the UI can pre-fill prior intent.
 *   link   — pick existing target
 *   create — create new category named `newName`
 *   skip   — fall through to system "uncategorized"
 */
export const categoryMappingCache = pgTable(
  "category_mapping_cache",
  {
    action: text("action").$type<"link" | "create" | "skip">().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow().notNull(),
    newName: text("new_name"),
    sourceLabel: text("source_label").notNull(),
    targetCategoryId: uuid("target_category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sourceLabel] })],
);

export type CategoryMappingCache = typeof categoryMappingCache.$inferSelect;
