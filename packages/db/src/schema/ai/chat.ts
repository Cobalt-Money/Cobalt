import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

// Chat tables
export const chats = pgTable(
  "chats",
  {
    chatId: varchar("chat_id").primaryKey(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
    index("chats_updated_at_idx").on(table.updatedAt),
    index("chats_chat_id_updated_at_idx").on(table.chatId, table.updatedAt),
  ],
);

export const messages = pgTable(
  "messages",
  {
    chatId: varchar("chat_id")
      .references(() => chats.chatId, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    messageId: varchar("message_id").primaryKey(),
    role: varchar("role").notNull(),
  },
  (table) => [
    index("messages_chat_id_idx").on(table.chatId),
    index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
  ],
);

export const parts = pgTable(
  "parts",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    data: jsonb("data"),
    file_filename: varchar("file_filename"),
    file_mediaType: varchar("file_media_type"),
    file_url: varchar("file_url"),
    messageId: varchar("message_id")
      .references(() => messages.messageId, { onDelete: "cascade" })
      .notNull(),
    order: integer("order").notNull().default(0),
    partId: varchar("part_id").primaryKey(),
    providerMetadata: jsonb("provider_metadata"),
    reasoning_text: text("reasoning_text"),
    source_document_filename: varchar("source_document_filename"),
    source_document_mediaType: varchar("source_document_media_type"),
    source_document_sourceId: varchar("source_document_source_id"),
    source_document_title: varchar("source_document_title"),
    source_url_sourceId: varchar("source_url_source_id"),
    source_url_title: varchar("source_url_title"),
    source_url_url: varchar("source_url_url"),
    text_text: text("text_text"),
    tool_errorText: varchar("tool_error_text"),
    tool_input: jsonb("tool_input"),
    tool_output: jsonb("tool_output"),
    tool_state: varchar("tool_state"),
    tool_toolCallId: varchar("tool_call_id"),
    type: varchar("type").notNull(),
  },
  (t) => [
    index("parts_message_id_idx").on(t.messageId),
    index("parts_message_id_order_idx").on(t.messageId, t.order),

    check(
      "text_text_required_if_type_is_text",
      sql`CASE WHEN ${t.type} = 'text' THEN ${t.text_text} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "reasoning_text_required_if_type_is_reasoning",
      sql`CASE WHEN ${t.type} = 'reasoning' THEN ${t.reasoning_text} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "file_fields_required_if_type_is_file",
      sql`CASE WHEN ${t.type} = 'file' THEN ${t.file_mediaType} IS NOT NULL AND ${t.file_url} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "source_url_fields_required_if_type_is_source_url",
      sql`CASE WHEN ${t.type} = 'source_url' THEN ${t.source_url_sourceId} IS NOT NULL AND ${t.source_url_url} IS NOT NULL ELSE TRUE END`,
    ),
    check(
      "source_document_fields_required_if_type_is_source_document",
      sql`CASE WHEN ${t.type} = 'source_document' THEN ${t.source_document_sourceId} IS NOT NULL AND ${t.source_document_mediaType} IS NOT NULL AND ${t.source_document_title} IS NOT NULL ELSE TRUE END`,
    ),
  ],
);

// Type exports
export type ChatSelect = typeof chats.$inferSelect;
export type ChatInsert = typeof chats.$inferInsert;
export type PartInsert = typeof parts.$inferInsert;
export type PartSelect = typeof parts.$inferSelect;
