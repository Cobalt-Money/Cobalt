import {
  date,
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  decimal,
  integer,
} from "drizzle-orm/pg-core";

import { user } from "../auth/auth";
import { appFullAccess, agentSelectOwn } from "../rls";

// Portfolio Snapshots - stores daily account balance snapshots for historical charting
/** @deprecated Use `snapshot` from `@cobalt-web/db/schema/accounts/snapshot`. */
export const portfolioSnapshots = pgTable.withRLS(
  "portfolio_snapshot",
  {
    accountId: varchar("account_id").notNull(),
    accountName: varchar("account_name"),
    accountType: varchar("account_type").notNull(),
    buyingPower: decimal("buying_power", { precision: 15, scale: 2 }),
    cashValue: decimal("cash_value", { precision: 15, scale: 2 }),

    createdAt: timestamp("created_at")
      .notNull()
      .$default(() => new Date()),

    currencyCode: varchar("currency_code")
      .notNull()
      .$default(() => "USD"),
    id: uuid("id").defaultRandom().primaryKey(),
    institutionName: varchar("institution_name"),
    positionsCount: integer("positions_count").$default(() => 0),

    positionsValue: decimal("positions_value", { precision: 15, scale: 2 }),

    rawBalanceData: jsonb("raw_balance_data"),
    snapTradeAccountId: varchar("snaptrade_account_id"),

    snapshotDate: date("snapshot_date").notNull(),
    totalValue: decimal("total_value", { precision: 15, scale: 2 }),

    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    index("portfolio_snapshot_user_id_idx").on(table.userId),
    index("portfolio_snapshot_account_id_idx").on(table.accountId),
    index("portfolio_snapshot_snaptrade_account_id_idx").on(
      table.snapTradeAccountId
    ),
    index("portfolio_snapshot_snapshot_date_idx").on(table.snapshotDate),
    uniqueIndex("portfolio_snapshot_account_date_idx").on(
      table.accountId,
      table.snapshotDate
    ),
    appFullAccess(),
    agentSelectOwn("user_id"),
  ]
);

// Type exports
export type PortfolioSnapshotRow = typeof portfolioSnapshots.$inferSelect;
export type PortfolioSnapshotInsert = typeof portfolioSnapshots.$inferInsert;

export interface PortfolioSnapshot {
  snapshotDate: string;
  value: number;
  cash: number;
  positions: number;
  accountId: string;
}
