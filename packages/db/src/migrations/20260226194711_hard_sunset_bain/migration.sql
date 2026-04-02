DROP INDEX "portfolio_snapshots_user_account_date_idx";--> statement-breakpoint
DROP INDEX "balance_snapshots_account_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_snapshots_account_date_idx" ON "brokerage_portfolio_snapshots" USING btree ("account_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "balance_snapshots_account_date_idx" ON "account_balance_snapshots" USING btree ("plaid_account_id","snapshot_date");