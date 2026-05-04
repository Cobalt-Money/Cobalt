import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

import { user } from "../auth/auth";

export const mobileSubscription = pgTable(
  "mobile_subscription",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    environment: text("environment")
      .notNull()
      .$defaultFn(() => "Production"),
    expiresAt: timestamp("expires_at"),
    id: text("id").primaryKey(),
    latestTransactionId: text("latest_transaction_id"),
    originalTransactionId: text("original_transaction_id").notNull().unique(),
    productId: text("product_id").notNull(),
    status: text("status")
      .notNull()
      .$defaultFn(() => "active"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("mobile_subscription_user_id_idx").on(table.userId),
    index("mobile_subscription_original_transaction_id_idx").on(table.originalTransactionId),
    index("mobile_subscription_status_idx").on(table.status),
  ],
);

// Type exports
export type MobileSubscription = typeof mobileSubscription.$inferSelect;
export type MobileSubscriptionInsert = typeof mobileSubscription.$inferInsert;
