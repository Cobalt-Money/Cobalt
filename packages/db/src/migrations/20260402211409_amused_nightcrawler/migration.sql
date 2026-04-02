CREATE TABLE "user_alerts" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message" text,
	"metadata" jsonb,
	"resolved_at" timestamp,
	"source" text NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_accounts" RENAME TO "bank_account";--> statement-breakpoint
ALTER TABLE "plaid_balances" RENAME TO "bank_balance";--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" RENAME TO "bank_balance_snapshot";--> statement-breakpoint
ALTER TABLE "plaid_items" RENAME TO "bank_connection";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" RENAME TO "brokerage_account_detail";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_accounts_brokerage_auth_id_idx" ON "brokerage_accounts" USING btree ("brokerage_auth_id");--> statement-breakpoint
ALTER TABLE "brokerage_accounts" RENAME TO "brokerage_account";--> statement-breakpoint
ALTER TABLE "brokerage_activities" RENAME TO "brokerage_activity";--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" RENAME TO "brokerage_authorization";--> statement-breakpoint
ALTER TABLE "brokerage_balances" RENAME TO "brokerage_balance";--> statement-breakpoint
ALTER TABLE "brokerage_orders" RENAME TO "brokerage_order";--> statement-breakpoint
ALTER TABLE "brokerage_positions" RENAME TO "brokerage_position";--> statement-breakpoint
ALTER TABLE "snaptrade_users" RENAME TO "brokerage_user";--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" RENAME TO "credit_liability";--> statement-breakpoint
ALTER TABLE "plaid_institutions" RENAME TO "institution";--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" RENAME TO "investment_activity";--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" RENAME TO "investment_position";--> statement-breakpoint
ALTER TABLE "plaid_investment_securities" RENAME TO "investment_security";--> statement-breakpoint
ALTER TABLE "app_store_subscription" RENAME TO "mobile_subscription";--> statement-breakpoint
ALTER TABLE "plaid_mortgage_liabilities" RENAME TO "mortgage_liability";--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" RENAME TO "portfolio_snapshot";--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" RENAME TO "recurring_stream";--> statement-breakpoint
ALTER TABLE "plaid_student_loan_liabilities" RENAME TO "student_loan_liability";--> statement-breakpoint
ALTER TABLE "plaid_transactions" RENAME TO "transaction";--> statement-breakpoint
ALTER TABLE "bank_balance" RENAME COLUMN "last_updated" TO "updated_at";--> statement-breakpoint
ALTER TABLE "brokerage_authorization" RENAME COLUMN "disabled_date" TO "disabled_at";--> statement-breakpoint
ALTER TABLE "brokerage_user" RENAME COLUMN "registered_at" TO "created_at";--> statement-breakpoint
ALTER TABLE "brokerage_user" RENAME COLUMN "last_verified" TO "last_verified_at";--> statement-breakpoint
ALTER TABLE "kalshi_users" RENAME COLUMN "last_verified" TO "last_verified_at";--> statement-breakpoint
ALTER TABLE "messages" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "file_mediaType" TO "file_media_type";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "providerMetadata" TO "provider_metadata";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "source_document_mediaType" TO "source_document_media_type";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "source_document_sourceId" TO "source_document_source_id";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "source_url_sourceId" TO "source_url_source_id";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "tool_errorText" TO "tool_error_text";--> statement-breakpoint
ALTER TABLE "parts" RENAME COLUMN "tool_toolCallId" TO "tool_call_id";--> statement-breakpoint
ALTER INDEX "plaid_accounts_item_id_idx" RENAME TO "bank_account_connection_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_accounts_item_type_idx" RENAME TO "bank_account_connection_type_idx";--> statement-breakpoint
ALTER INDEX "plaid_balances_account_id_idx" RENAME TO "bank_balance_account_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_balances_last_updated_idx" RENAME TO "bank_balance_updated_at_idx";--> statement-breakpoint
ALTER INDEX "plaid_balances_account_updated_idx" RENAME TO "bank_balance_account_updated_idx";--> statement-breakpoint
ALTER INDEX "balance_snapshots_account_id_idx" RENAME TO "bank_balance_snapshot_account_id_idx";--> statement-breakpoint
ALTER INDEX "balance_snapshots_date_idx" RENAME TO "bank_balance_snapshot_date_idx";--> statement-breakpoint
ALTER INDEX "balance_snapshots_account_date_idx" RENAME TO "bank_balance_snapshot_account_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_items_institution_id_idx" RENAME TO "bank_connection_institution_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_items_user_institution_idx" RENAME TO "bank_connection_user_institution_idx";--> statement-breakpoint
ALTER INDEX "brokerage_account_details_account_id_idx" RENAME TO "brokerage_account_detail_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_account_details_user_id_idx" RENAME TO "brokerage_account_detail_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_account_details_snaptrade_account_id_idx" RENAME TO "brokerage_account_detail_snaptrade_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_account_details_brokerage_authorization_id_idx" RENAME TO "brokerage_account_detail_brokerage_authorization_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_accounts_user_id_idx" RENAME TO "brokerage_account_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_accounts_brokerage_auth_id_idx" RENAME TO "brokerage_account_brokerage_auth_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_accounts_account_id_idx" RENAME TO "brokerage_account_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_accounts_sync_status_idx" RENAME TO "brokerage_account_sync_status_idx";--> statement-breakpoint
ALTER INDEX "brokerage_accounts_account_status_idx" RENAME TO "brokerage_account_account_status_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_account_id_idx" RENAME TO "brokerage_activity_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_user_id_idx" RENAME TO "brokerage_activity_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_activity_id_idx" RENAME TO "brokerage_activity_activity_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_snap_trade_account_id_idx" RENAME TO "brokerage_activity_snap_trade_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_type_idx" RENAME TO "brokerage_activity_type_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_symbol_ticker_idx" RENAME TO "brokerage_activity_symbol_ticker_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_trade_date_idx" RENAME TO "brokerage_activity_trade_date_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_settlement_date_idx" RENAME TO "brokerage_activity_settlement_date_idx";--> statement-breakpoint
ALTER INDEX "brokerage_activities_user_trade_date_idx" RENAME TO "brokerage_activity_user_trade_date_idx";--> statement-breakpoint
ALTER INDEX "brokerage_auths_user_id_idx" RENAME TO "brokerage_auth_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_auths_brokerage_slug_idx" RENAME TO "brokerage_auth_brokerage_slug_idx";--> statement-breakpoint
ALTER INDEX "brokerage_auths_authorization_id_idx" RENAME TO "brokerage_auth_authorization_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_auths_is_disabled_idx" RENAME TO "brokerage_auth_is_disabled_idx";--> statement-breakpoint
ALTER INDEX "brokerage_balances_account_id_idx" RENAME TO "brokerage_balance_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_balances_user_id_idx" RENAME TO "brokerage_balance_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_balances_snaptrade_account_id_idx" RENAME TO "brokerage_balance_snaptrade_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_balances_currency_code_idx" RENAME TO "brokerage_balance_currency_code_idx";--> statement-breakpoint
ALTER INDEX "brokerage_balances_account_currency_idx" RENAME TO "brokerage_balance_account_currency_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_account_id_idx" RENAME TO "brokerage_order_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_user_id_idx" RENAME TO "brokerage_order_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_brokerage_order_id_idx" RENAME TO "brokerage_order_brokerage_order_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_snap_trade_account_id_idx" RENAME TO "brokerage_order_snap_trade_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_status_idx" RENAME TO "brokerage_order_status_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_symbol_idx" RENAME TO "brokerage_order_symbol_idx";--> statement-breakpoint
ALTER INDEX "brokerage_orders_time_placed_idx" RENAME TO "brokerage_order_time_placed_idx";--> statement-breakpoint
ALTER INDEX "brokerage_positions_account_id_idx" RENAME TO "brokerage_position_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_positions_user_id_idx" RENAME TO "brokerage_position_user_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_positions_symbol_idx" RENAME TO "brokerage_position_symbol_idx";--> statement-breakpoint
ALTER INDEX "brokerage_positions_snap_trade_account_id_idx" RENAME TO "brokerage_position_snap_trade_account_id_idx";--> statement-breakpoint
ALTER INDEX "brokerage_positions_account_symbol_idx" RENAME TO "brokerage_position_account_symbol_idx";--> statement-breakpoint
ALTER INDEX "snaptrade_users_snaptrade_user_id_idx" RENAME TO "brokerage_user_snaptrade_user_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_institutions_id_idx" RENAME TO "institution_provider_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_institutions_name_idx" RENAME TO "institution_name_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_tx_account_idx" RENAME TO "investment_activity_account_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_tx_date_idx" RENAME TO "investment_activity_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_tx_account_date_idx" RENAME TO "investment_activity_account_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_tx_security_idx" RENAME TO "investment_activity_security_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_tx_type_idx" RENAME TO "investment_activity_type_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_holdings_account_idx" RENAME TO "investment_position_account_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_holdings_security_idx" RENAME TO "investment_position_security_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_holdings_account_security_idx" RENAME TO "investment_position_account_security_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_securities_ticker_idx" RENAME TO "investment_security_ticker_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_securities_type_idx" RENAME TO "investment_security_type_idx";--> statement-breakpoint
ALTER INDEX "plaid_inv_securities_sector_idx" RENAME TO "investment_security_sector_idx";--> statement-breakpoint
ALTER INDEX "app_store_subscription_user_id_idx" RENAME TO "mobile_subscription_user_id_idx";--> statement-breakpoint
ALTER INDEX "app_store_subscription_original_transaction_id_idx" RENAME TO "mobile_subscription_original_transaction_id_idx";--> statement-breakpoint
ALTER INDEX "app_store_subscription_status_idx" RENAME TO "mobile_subscription_status_idx";--> statement-breakpoint
ALTER INDEX "portfolio_snapshots_user_id_idx" RENAME TO "portfolio_snapshot_user_id_idx";--> statement-breakpoint
ALTER INDEX "portfolio_snapshots_account_id_idx" RENAME TO "portfolio_snapshot_account_id_idx";--> statement-breakpoint
ALTER INDEX "portfolio_snapshots_snaptrade_account_id_idx" RENAME TO "portfolio_snapshot_snaptrade_account_id_idx";--> statement-breakpoint
ALTER INDEX "portfolio_snapshots_snapshot_date_idx" RENAME TO "portfolio_snapshot_snapshot_date_idx";--> statement-breakpoint
ALTER INDEX "portfolio_snapshots_account_date_idx" RENAME TO "portfolio_snapshot_account_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_recurring_streams_account_id_idx" RENAME TO "recurring_stream_account_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_recurring_streams_account_date_type_idx" RENAME TO "recurring_stream_account_date_type_idx";--> statement-breakpoint
ALTER INDEX "plaid_transactions_account_id_idx" RENAME TO "transaction_account_id_idx";--> statement-breakpoint
ALTER INDEX "plaid_transactions_date_idx" RENAME TO "transaction_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_transactions_account_date_idx" RENAME TO "transaction_account_date_idx";--> statement-breakpoint
ALTER INDEX "plaid_transactions_pending_idx" RENAME TO "transaction_pending_idx";--> statement-breakpoint
ALTER INDEX "plaid_transactions_date_pending_idx" RENAME TO "transaction_date_pending_idx";--> statement-breakpoint
ALTER TABLE "bank_balance" ADD COLUMN "user_override_credit_limit" real;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_events_tickers_idx" ON "financial_events" USING gin ("tickers");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_alerts_user_id_status_idx" ON "user_alerts" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_alerts_source_source_id_idx" ON "user_alerts" ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_alerts_active_dedup_idx" ON "user_alerts" ("source","source_id","type") WHERE status NOT IN ('resolved', 'dismissed');--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "text_text_required_if_type_is_text", ADD CONSTRAINT "text_text_required_if_type_is_text" CHECK (CASE WHEN "type" = 'text' THEN "text_text" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "reasoning_text_required_if_type_is_reasoning", ADD CONSTRAINT "reasoning_text_required_if_type_is_reasoning" CHECK (CASE WHEN "type" = 'reasoning' THEN "reasoning_text" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "file_fields_required_if_type_is_file", ADD CONSTRAINT "file_fields_required_if_type_is_file" CHECK (CASE WHEN "type" = 'file' THEN "file_media_type" IS NOT NULL AND "file_url" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "source_url_fields_required_if_type_is_source_url", ADD CONSTRAINT "source_url_fields_required_if_type_is_source_url" CHECK (CASE WHEN "type" = 'source_url' THEN "source_url_source_id" IS NOT NULL AND "source_url_url" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "source_document_fields_required_if_type_is_source_document", ADD CONSTRAINT "source_document_fields_required_if_type_is_source_document" CHECK (CASE WHEN "type" = 'source_document' THEN "source_document_source_id" IS NOT NULL AND "source_document_media_type" IS NOT NULL AND "source_document_title" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "account";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "bank_account";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "bank_balance";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "bank_balance_snapshot";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_balance_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "bank_connection";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_connection" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_account_detail";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_account_detail" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_account";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_activity";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_authorization";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_authorization" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_balance";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_order";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_order" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_position";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "brokerage_user";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "chats";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "chats" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "credit_liability";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "credit_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "event_articles";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "event_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "event_articles";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "event_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "feedback";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "feedback" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "financial_events";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_events" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "financial_events";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "financial_events" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "financial_goals";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_goals" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "institution";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "institution" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "institution";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "institution" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "investment_activity";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "investment_position";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "investment_security";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_security" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "investment_security";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "investment_security" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "kalshi_users";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "kalshi_users" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "message_votes";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "message_votes" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "messages";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "messages" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "mobile_subscription";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "mobile_subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_own" ON "mobile_subscription";--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "mobile_subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "mortgage_liability";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "mortgage_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "parts";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "parts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "portfolio_snapshot";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "portfolio_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "recurring_stream";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "recurring_stream" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "rss_articles";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "rss_articles";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "rss_feeds";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_feeds" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_public" ON "rss_feeds";--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_feeds" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "session";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "session" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "student_loan_liability";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "student_loan_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "subscription";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_own" ON "subscription";--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "reference_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "transaction";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "transaction" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "user";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "user_alerts";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "user_alerts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
DROP POLICY IF EXISTS "agent_select_own" ON "user_alerts";--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "user_alerts" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
DROP POLICY IF EXISTS "app_full_access" ON "verification";--> statement-breakpoint
CREATE POLICY "app_full_access" ON "verification" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "account" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "session" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "user" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "bank_connection" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "bank_balance_snapshot" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "bank_balance_snapshot"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "bank_account" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_connection
      WHERE bank_connection.plaid_item_id = "bank_account"."plaid_item_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "bank_balance" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "bank_balance"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "recurring_stream" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "recurring_stream"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "transaction" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "transaction"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "credit_liability" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "credit_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "mortgage_liability" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "mortgage_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "student_loan_liability" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "student_loan_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "investment_position" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "investment_position"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "investment_activity" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "investment_activity"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_user" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_authorization" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_account_detail" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_account" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_balance" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_position" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_activity" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_order" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "portfolio_snapshot" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "financial_goals" TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));