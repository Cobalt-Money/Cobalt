import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../users/auth/auth";

export const snaptradeAuthorization = pgTable(
  "snaptrade_authorization",
  {
    authorizationId: text("authorization_id").notNull().unique(),
    brokerage: text("brokerage").notNull(),
    brokerageSlug: text("brokerage_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    id: uuid("id").defaultRandom().primaryKey(),
    isDisabled: boolean("is_disabled").default(false).notNull(),
    isEligibleForPayout: boolean("is_eligible_for_payout")
      .default(false)
      .notNull(),
    meta: jsonb("meta"),
    name: text("name").notNull(),
    type: text("type"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("snaptrade_auth_user_id_idx").on(t.userId),
    index("snaptrade_auth_brokerage_slug_idx").on(t.brokerageSlug),
    index("snaptrade_auth_is_disabled_idx").on(t.isDisabled),
  ]
);

export type SnaptradeAuthorization = typeof snaptradeAuthorization.$inferSelect;
export type SnaptradeAuthorizationInsert =
  typeof snaptradeAuthorization.$inferInsert;
