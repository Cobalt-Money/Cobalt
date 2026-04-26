import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { appFullAccess, agentSelectOwn } from "../rls";

// Brokerage authorization - tracks connected brokerage accounts
/** @deprecated Use `snaptradeAuthorization` from `@cobalt-web/db/schema/providers/snaptrade/authorization`. */
export const brokerageAuthorizations = pgTable.withRLS(
  "brokerage_authorization",
  {
    authorizationId: varchar("authorization_id").notNull().unique(),
    brokerage: varchar("brokerage").notNull(),
    brokerageSlug: varchar("brokerage_slug").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),
    disabledAt: timestamp("disabled_at"),
    id: uuid("id").defaultRandom().primaryKey(),
    isDisabled: integer("is_disabled").$default(() => 0),
    isEligibleForPayout: integer("is_eligible_for_payout").$default(() => 0),
    meta: jsonb("meta"),
    name: varchar("name").notNull(),
    type: varchar("type"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("brokerage_auth_user_id_idx").on(table.userId),
    index("brokerage_auth_brokerage_slug_idx").on(table.brokerageSlug),
    index("brokerage_auth_authorization_id_idx").on(table.authorizationId),
    index("brokerage_auth_is_disabled_idx").on(table.isDisabled),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

// Type exports
export type BrokerageAuthorization =
  typeof brokerageAuthorizations.$inferSelect;
export type BrokerageAuthorizationInsert =
  typeof brokerageAuthorizations.$inferInsert;
