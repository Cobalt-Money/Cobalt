ALTER TABLE "account_balance_snapshots" ALTER COLUMN "snapshot_date" SET DATA TYPE date USING NULLIF(TRIM(snapshot_date::text), '')::date;--> statement-breakpoint
ALTER TABLE "plaid_transactions" ALTER COLUMN "authorized_date" SET DATA TYPE date USING NULLIF(TRIM(authorized_date::text), '')::date;--> statement-breakpoint
ALTER TABLE "plaid_transactions" ALTER COLUMN "date" SET DATA TYPE date USING NULLIF(TRIM(date::text), '')::date;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "trade_date" SET DATA TYPE date USING NULLIF(TRIM(trade_date::text), '')::date;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "settlement_date" SET DATA TYPE date USING NULLIF(TRIM(settlement_date::text), '')::date;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ALTER COLUMN "snapshot_date" SET DATA TYPE date USING NULLIF(TRIM(snapshot_date::text), '')::date;