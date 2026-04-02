-- Convert timestamp to date-only text (YYYY-MM-DD) to avoid timezone shifts
ALTER TABLE "account_balance_snapshots" ALTER COLUMN "snapshot_date" SET DATA TYPE text USING to_char("snapshot_date", 'YYYY-MM-DD');--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "trade_date" SET DATA TYPE text USING CASE WHEN "trade_date" IS NOT NULL THEN to_char("trade_date", 'YYYY-MM-DD') ELSE NULL END;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "settlement_date" SET DATA TYPE text USING CASE WHEN "settlement_date" IS NOT NULL THEN to_char("settlement_date", 'YYYY-MM-DD') ELSE NULL END;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ALTER COLUMN "snapshot_date" SET DATA TYPE text USING to_char("snapshot_date", 'YYYY-MM-DD');