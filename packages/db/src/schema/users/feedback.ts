import { index, pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

export const feedbackTypeEnum = pgEnum("feedback_type", ["general", "bug", "feature"]);

export const feedback = pgTable(
  "feedback",
  {
    contactEmail: text("contact_email"),
    contactName: text("contact_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    message: text("message").notNull(),
    subject: text("subject").notNull(),
    type: feedbackTypeEnum("type").notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_type_idx").on(table.type),
    index("feedback_created_at_idx").on(table.createdAt),
  ],
);

// Type exports
export type Feedback = typeof feedback.$inferSelect;
export type FeedbackInsert = typeof feedback.$inferInsert;
