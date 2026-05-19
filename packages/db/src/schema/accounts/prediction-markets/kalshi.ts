import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "../../users/auth/auth";

export const kalshiUsers = pgTable(
  "kalshi_users",
  {
    apiKeyId: varchar("api_key_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    lastVerifiedAt: timestamp("last_verified_at"),
    privateKeyPem: text("private_key_pem").notNull(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("kalshi_users_api_key_id_idx").on(table.apiKeyId)],
);

// Type exports
export type KalshiUser = typeof kalshiUsers.$inferSelect;
export type KalshiUserInsert = typeof kalshiUsers.$inferInsert;
