DROP ROLE "authenticated";--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_institutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "plaid_investment_securities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "app_store_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rss_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rss_feeds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kalshi_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "account" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("account"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "session" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("session"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "user" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("user"."id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_items" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "account_balance_snapshots" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "account_balance_snapshots"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_accounts" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_items
        WHERE plaid_items.plaid_item_id = "plaid_accounts"."plaid_item_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_balances" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_balances"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_recurring_streams" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_recurring_streams"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_transactions" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_transactions"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_credit_liabilities" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_credit_liabilities"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_mortgage_liabilities"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_student_loan_liabilities"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_investment_holdings" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_investment_holdings"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "plaid_investment_transactions" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING (EXISTS (
        SELECT 1 FROM plaid_accounts
        JOIN plaid_items ON plaid_items.plaid_item_id = plaid_accounts.plaid_item_id
        WHERE plaid_accounts.plaid_account_id = "plaid_investment_transactions"."plaid_account_id"
        AND plaid_items.user_id = (SELECT current_setting('request.jwt.claim.sub', true))
      ));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "snaptrade_users" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("snaptrade_users"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_authorizations" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_authorizations"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_account_details" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_account_details"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_accounts" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_accounts"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_balances" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_balances"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_positions" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_positions"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_activities" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_activities"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_orders" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_orders"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("brokerage_portfolio_snapshots"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "financial_goals" AS PERMISSIVE FOR SELECT TO "agent_readonly" USING ("financial_goals"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));