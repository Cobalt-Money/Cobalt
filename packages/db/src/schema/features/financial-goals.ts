import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  decimal,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";

export const financialGoals = pgTable(
  "financial_goals",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    icon: varchar("icon").notNull().default("target"),
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name").notNull(),
    targetAmount: decimal("target_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    targetDate: timestamp("target_date"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("financial_goals_user_id_idx").on(table.userId),
    index("financial_goals_created_at_idx").on(table.createdAt),
  ]
);

export type FinancialGoal = typeof financialGoals.$inferSelect;
export type FinancialGoalInsert = typeof financialGoals.$inferInsert;
