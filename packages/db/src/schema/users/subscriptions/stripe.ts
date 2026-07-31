import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const subscription = pgTable(
  "subscription",
  {
    billingInterval: text("billing_interval"),
    // Added by @better-auth/stripe 1.7 alongside the four columns above it.
    // Scheduled-cancellation bookkeeping: `cancel_at` is the future effective
    // date, `canceled_at` when the request was made, `ended_at` when the
    // subscription actually stopped.
    cancelAt: timestamp("cancel_at"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").$defaultFn(() => false),
    canceledAt: timestamp("canceled_at"),
    endedAt: timestamp("ended_at"),
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
    /** Stripe subscription schedule backing a pending plan change. */
    stripeScheduleId: text("stripe_schedule_id"),
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
