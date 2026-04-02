DO $$ BEGIN CREATE ROLE "authenticated"; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_institutions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_balances" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_mortgage_liabilities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_student_loan_liabilities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "snaptrade_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_balances" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_positions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_activities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_orders" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_store_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_goals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kalshi_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_votes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "authenticated can read own accounts" ON "account" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own accounts" ON "account" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own accounts" ON "account" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own accounts" ON "account" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own sessions" ON "session" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own sessions" ON "session" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own sessions" ON "session" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own sessions" ON "session" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own subscriptions" ON "subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own subscriptions" ON "subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own subscriptions" ON "subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own subscriptions" ON "subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own user" ON "user" CASCADE;--> statement-breakpoint
DROP POLICY "supabase_auth_admin can insert user" ON "user" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own user" ON "user" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own chats" ON "chats" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own chats" ON "chats" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own chats" ON "chats" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own chats" ON "chats" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read messages from own chats" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert messages to own chats" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update messages in own chats" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete messages from own chats" ON "messages" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read parts from own chats" ON "parts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert parts to own chats" ON "parts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update parts in own chats" ON "parts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete parts from own chats" ON "parts" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_institutions" ON "plaid_institutions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_student_loans" ON "plaid_student_loan_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_student_loans" ON "plaid_student_loan_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_student_loans" ON "plaid_student_loan_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_student_loans" ON "plaid_student_loan_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_inv_holdings" ON "plaid_investment_holdings" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_inv_holdings" ON "plaid_investment_holdings" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_inv_holdings" ON "plaid_investment_holdings" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_inv_holdings" ON "plaid_investment_holdings" CASCADE;--> statement-breakpoint
DROP POLICY "auth_read_plaid_inv_transactions" ON "plaid_investment_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_insert_plaid_inv_transactions" ON "plaid_investment_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_update_plaid_inv_transactions" ON "plaid_investment_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "auth_delete_plaid_inv_transactions" ON "plaid_investment_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own snaptrade users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own snaptrade users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own snaptrade users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own snaptrade users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage account details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage account details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage account details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage account details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own app store subscriptions" ON "app_store_subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own app store subscriptions" ON "app_store_subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own app store subscriptions" ON "app_store_subscription" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own feedback" ON "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own feedback" ON "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own feedback" ON "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own feedback" ON "feedback" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own financial goals" ON "financial_goals" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own financial goals" ON "financial_goals" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own financial goals" ON "financial_goals" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own financial goals" ON "financial_goals" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own kalshi users" ON "kalshi_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own kalshi users" ON "kalshi_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own kalshi users" ON "kalshi_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own kalshi users" ON "kalshi_users" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can read own message votes" ON "message_votes" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can insert own message votes" ON "message_votes" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can update own message votes" ON "message_votes" CASCADE;--> statement-breakpoint
DROP POLICY "authenticated can delete own message votes" ON "message_votes" CASCADE;