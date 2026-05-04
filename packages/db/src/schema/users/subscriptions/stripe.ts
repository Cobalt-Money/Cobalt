import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const subscription = pgTable(
  "subscription",
  {
    billingInterval: text("billing_interval"),
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
    index("subscription_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
  ],
);

export type Subscription = typeof subscription.$inferSelect;
export type SubscriptionInsert = typeof subscription.$inferInsert;
