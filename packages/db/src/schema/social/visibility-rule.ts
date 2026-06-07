import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { category } from "../accounts/banking/categories/category";
import { user } from "../users/auth/auth";

/**
 * Per-user, per-category auto-share rule. When a new Plaid txn ingests
 * and the user has `auto_share=true` for its category, a `social_post`
 * row is created automatically (subject to privacy zone check).
 *
 * Absence of a row = default off (private).
 */
export const socialVisibilityRule = pgTable(
  "social_visibility_rule",
  {
    autoShare: boolean("auto_share").default(false).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("social_visibility_rule_user_cat_uq").on(table.userId, table.categoryId)],
);
