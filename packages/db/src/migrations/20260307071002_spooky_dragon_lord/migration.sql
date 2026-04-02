ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_mortgage_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_student_loan_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "snaptrade_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_positions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "app_full_access" ON "account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "session" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING ("reference_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "verification" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "chats" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "messages" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "parts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_institutions" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "plaid_institutions" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_items" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "account_balance_snapshots" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_accounts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_balances" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_recurring_streams" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_transactions" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_credit_liabilities" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_investment_holdings" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_investment_securities" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "plaid_investment_securities" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "plaid_investment_transactions" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "snaptrade_users" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_authorizations" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_account_details" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_accounts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_balances" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_positions" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_activities" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_orders" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "app_store_subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "app_store_subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "feedback" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "event_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "event_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_events" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "financial_events" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_goals" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_feeds" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_feeds" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "kalshi_users" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "message_votes" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "account" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "session" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "user" TO pg_read_all_data USING ("id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_items" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "account_balance_snapshots" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "account_balance_snapshots"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_accounts" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_items
      WHERE plaid_items.plaid_item_id = "plaid_accounts"."plaid_item_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_balances" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_balances"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_recurring_streams" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_recurring_streams"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_transactions" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_transactions"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_credit_liabilities" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_credit_liabilities"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_mortgage_liabilities" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_mortgage_liabilities"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_student_loan_liabilities" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_student_loan_liabilities"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_investment_holdings" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_investment_holdings"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "plaid_investment_transactions" TO pg_read_all_data USING (EXISTS (
      SELECT 1 FROM plaid_accounts
      JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
      WHERE plaid_accounts.plaid_account_id = "plaid_investment_transactions"."plaid_account_id"
      AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "snaptrade_users" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_authorizations" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_account_details" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_accounts" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_balances" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_positions" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_activities" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_orders" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "brokerage_portfolio_snapshots" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
ALTER POLICY "agent_select_own" ON "financial_goals" TO pg_read_all_data USING ("user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));