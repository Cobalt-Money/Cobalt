import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { messages } from "../ai/chat";
import { user } from "../auth";

export const messageVotes = pgTable(
  "message_votes",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: varchar("message_id")
      .references(() => messages.messageId, { onDelete: "cascade" })
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    vote: varchar("vote").$type<"positive" | "negative">().notNull(),
  },
  (table) => [
    unique("message_votes_user_message_unique").on(
      table.userId,
      table.messageId
    ),
    index("message_votes_user_id_idx").on(table.userId),
    index("message_votes_message_id_idx").on(table.messageId),
  ]
);

// Type exports
export type MessageVote = typeof messageVotes.$inferSelect;
export type MessageVoteInsert = typeof messageVotes.$inferInsert;
