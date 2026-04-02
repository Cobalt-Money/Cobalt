import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { appFullAccess, agentSelectOwn } from "../rls";

// Brokerage user credentials - one per app user
export const brokerageUser = pgTable.withRLS(
  "brokerage_user",
  {
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    lastVerifiedAt: timestamp("last_verified_at"),
    providerUserId: varchar("snaptrade_user_id").notNull().unique(),
    providerUserSecret: varchar("snaptrade_user_secret").notNull(),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("brokerage_user_snaptrade_user_id_idx").on(table.providerUserId),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

// Type exports
export type BrokerageUser = typeof brokerageUser.$inferSelect;
export type BrokerageUserInsert = typeof brokerageUser.$inferInsert;
