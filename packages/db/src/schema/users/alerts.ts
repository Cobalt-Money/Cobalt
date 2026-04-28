import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const ALERT_STATUSES = {
  DISMISSED: "dismissed",
  READ: "read",
  RESOLVED: "resolved",
  UNREAD: "unread",
} as const;

export type AlertStatus = (typeof ALERT_STATUSES)[keyof typeof ALERT_STATUSES];

export const userAlerts = pgTable(
  "user_alerts",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    message: text("message"),
    metadata: jsonb("metadata"),
    resolvedAt: timestamp("resolved_at"),
    source: text("source").notNull(),
    sourceId: text("source_id"),
    status: text("status").default("unread").notNull(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("user_alerts_user_id_status_idx").on(table.userId, table.status),
    index("user_alerts_source_source_id_idx").on(table.source, table.sourceId),
    uniqueIndex("user_alerts_active_dedup_idx")
      .on(table.source, table.sourceId, table.type)
      .where(sql`status NOT IN ('resolved', 'dismissed')`),
  ]
);

// Type exports
export type UserAlert = typeof userAlerts.$inferSelect;
export type UserAlertInsert = typeof userAlerts.$inferInsert;
