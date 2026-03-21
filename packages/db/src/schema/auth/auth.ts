import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").unique(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    id: text("id").primaryKey(),
    image: text("image"),
    lastSeenAt: timestamp("last_seen_at"),
    name: text("name").notNull(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    createdAt: timestamp("created_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at").notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    // No `password` column — social-only auth (matches horizon-test auth-schema)
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    updatedAt: timestamp("updated_at").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const subscription = pgTable(
  "subscription",
  {
    cancelAtPeriodEnd: boolean("cancel_at_period_end").$defaultFn(() => false),
    id: text("id").primaryKey(),
    periodEnd: timestamp("period_end"),
    periodStart: timestamp("period_start"),
    plan: text("plan").notNull(),
    referenceId: text("reference_id").notNull(),
    seats: integer("seats"),
    status: text("status")
      .notNull()
      .$defaultFn(() => "incomplete"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    trialEnd: timestamp("trial_end"),
    trialStart: timestamp("trial_start"),
  },
  (table) => [
    index("subscription_reference_id_idx").on(table.referenceId),
    index("subscription_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("subscription_stripe_subscription_id_idx").on(
      table.stripeSubscriptionId
    ),
  ]
);

// Type exports
export type User = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type SessionInsert = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type VerificationInsert = typeof verification.$inferInsert;
export type Subscription = typeof subscription.$inferSelect;
export type SubscriptionInsert = typeof subscription.$inferInsert;
