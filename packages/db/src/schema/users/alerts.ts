import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

// Alert type & source constants
export const ALERT_TYPES = {
  CONNECTION_BROKEN: "connection_broken",
  NEW_ACCOUNTS: "new_accounts",
  PENDING_DISCONNECT: "pending_disconnect",
  REAUTH_NEEDED: "reauth_needed",
} as const;

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

export const ALERT_SOURCES = {
  PLAID: "plaid",
  SNAPTRADE: "snaptrade",
} as const;

export type AlertSource = (typeof ALERT_SOURCES)[keyof typeof ALERT_SOURCES];

export const userAlerts = pgTable(
  "user_alerts",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    metadata: jsonb("metadata"),
    resolvedAt: timestamp("resolved_at"),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    type: text("type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("user_alerts_active_idx").on(table.userId, table.resolvedAt),
    index("user_alerts_source_idx").on(table.source, table.sourceId),
    uniqueIndex("user_alerts_dedup_idx")
      .on(table.source, table.sourceId, table.type)
      .where(sql`resolved_at IS NULL`),
  ],
);

// Type exports
export type UserAlert = typeof userAlerts.$inferSelect;
export type UserAlertInsert = typeof userAlerts.$inferInsert;
