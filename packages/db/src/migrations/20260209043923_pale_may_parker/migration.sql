DROP POLICY "webhook_read_institutions" ON "plaid_institutions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_items" ON "plaid_items" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_balance_snapshots" ON "account_balance_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_accounts" ON "plaid_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_balances" ON "plaid_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_recurring_streams" ON "plaid_recurring_streams" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_transactions" ON "plaid_transactions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_snaptrade_users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_snaptrade_users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_snaptrade_users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_snaptrade_users" ON "snaptrade_users" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_authorizations" ON "brokerage_authorizations" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_account_details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_account_details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_account_details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_account_details" ON "brokerage_account_details" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_accounts" ON "brokerage_accounts" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_balances" ON "brokerage_balances" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_positions" ON "brokerage_positions" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_activities" ON "brokerage_activities" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_orders" ON "brokerage_orders" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_read_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_insert_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_update_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
DROP POLICY "webhook_delete_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" CASCADE;--> statement-breakpoint
ALTER POLICY "authenticated can read own accounts" ON "account" TO authenticated USING ("account"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own accounts" ON "account" TO authenticated WITH CHECK ("account"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own accounts" ON "account" TO authenticated USING ("account"."user_id" = (SELECT auth.uid())) WITH CHECK ("account"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own accounts" ON "account" TO authenticated USING ("account"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own sessions" ON "session" TO authenticated USING ("session"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own sessions" ON "session" TO authenticated WITH CHECK ("session"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own sessions" ON "session" TO authenticated USING ("session"."user_id" = (SELECT auth.uid())) WITH CHECK ("session"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own sessions" ON "session" TO authenticated USING ("session"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own subscriptions" ON "subscription" TO authenticated USING ("subscription"."reference_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own subscriptions" ON "subscription" TO authenticated WITH CHECK ("subscription"."reference_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own subscriptions" ON "subscription" TO authenticated USING ("subscription"."reference_id" = (SELECT auth.uid())) WITH CHECK ("subscription"."reference_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own subscriptions" ON "subscription" TO authenticated USING ("subscription"."reference_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own user" ON "user" TO authenticated USING ("user"."id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own user" ON "user" TO authenticated USING ("user"."id" = (SELECT auth.uid())) WITH CHECK ("user"."id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own chats" ON "chats" TO authenticated USING ("chats"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own chats" ON "chats" TO authenticated WITH CHECK ("chats"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own chats" ON "chats" TO authenticated USING ("chats"."user_id" = (SELECT auth.uid())) WITH CHECK ("chats"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own chats" ON "chats" TO authenticated USING ("chats"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read messages from own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can insert messages to own chats" ON "messages" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can update messages in own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can delete messages from own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can read parts from own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can insert parts to own chats" ON "parts" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can update parts in own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can delete parts from own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_items" ON "plaid_items" TO authenticated USING ("plaid_items"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_items" ON "plaid_items" TO authenticated WITH CHECK ("plaid_items"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_items" ON "plaid_items" TO authenticated USING ("plaid_items"."user_id" = (SELECT auth.uid())) WITH CHECK ("plaid_items"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_items" ON "plaid_items" TO authenticated USING ("plaid_items"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "auth_read_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_balance_snapshots" ON "account_balance_snapshots" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_accounts" ON "plaid_accounts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_accounts" ON "plaid_accounts" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_accounts" ON "plaid_accounts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_accounts" ON "plaid_accounts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_balances" ON "plaid_balances" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_balances" ON "plaid_balances" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_balances" ON "plaid_balances" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_balances" ON "plaid_balances" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_recurring_streams" ON "plaid_recurring_streams" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_recurring_streams" ON "plaid_recurring_streams" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_recurring_streams" ON "plaid_recurring_streams" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_recurring_streams" ON "plaid_recurring_streams" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_transactions" ON "plaid_transactions" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_transactions" ON "plaid_transactions" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_transactions" ON "plaid_transactions" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_transactions" ON "plaid_transactions" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can read own snaptrade users" ON "snaptrade_users" TO authenticated USING ("snaptrade_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own snaptrade users" ON "snaptrade_users" TO authenticated WITH CHECK ("snaptrade_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own snaptrade users" ON "snaptrade_users" TO authenticated USING ("snaptrade_users"."user_id" = (SELECT auth.uid())) WITH CHECK ("snaptrade_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own snaptrade users" ON "snaptrade_users" TO authenticated USING ("snaptrade_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage authorizations" ON "brokerage_authorizations" TO authenticated USING ("brokerage_authorizations"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage authorizations" ON "brokerage_authorizations" TO authenticated WITH CHECK ("brokerage_authorizations"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage authorizations" ON "brokerage_authorizations" TO authenticated USING ("brokerage_authorizations"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_authorizations"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage authorizations" ON "brokerage_authorizations" TO authenticated USING ("brokerage_authorizations"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage account details" ON "brokerage_account_details" TO authenticated USING ("brokerage_account_details"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage account details" ON "brokerage_account_details" TO authenticated WITH CHECK ("brokerage_account_details"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage account details" ON "brokerage_account_details" TO authenticated USING ("brokerage_account_details"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_account_details"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage account details" ON "brokerage_account_details" TO authenticated USING ("brokerage_account_details"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage accounts" ON "brokerage_accounts" TO authenticated USING ("brokerage_accounts"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage accounts" ON "brokerage_accounts" TO authenticated WITH CHECK ("brokerage_accounts"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage accounts" ON "brokerage_accounts" TO authenticated USING ("brokerage_accounts"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_accounts"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage accounts" ON "brokerage_accounts" TO authenticated USING ("brokerage_accounts"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage balances" ON "brokerage_balances" TO authenticated USING ("brokerage_balances"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage balances" ON "brokerage_balances" TO authenticated WITH CHECK ("brokerage_balances"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage balances" ON "brokerage_balances" TO authenticated USING ("brokerage_balances"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_balances"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage balances" ON "brokerage_balances" TO authenticated USING ("brokerage_balances"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage positions" ON "brokerage_positions" TO authenticated USING ("brokerage_positions"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage positions" ON "brokerage_positions" TO authenticated WITH CHECK ("brokerage_positions"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage positions" ON "brokerage_positions" TO authenticated USING ("brokerage_positions"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_positions"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage positions" ON "brokerage_positions" TO authenticated USING ("brokerage_positions"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage activities" ON "brokerage_activities" TO authenticated USING ("brokerage_activities"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage activities" ON "brokerage_activities" TO authenticated WITH CHECK ("brokerage_activities"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage activities" ON "brokerage_activities" TO authenticated USING ("brokerage_activities"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_activities"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage activities" ON "brokerage_activities" TO authenticated USING ("brokerage_activities"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage orders" ON "brokerage_orders" TO authenticated USING ("brokerage_orders"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage orders" ON "brokerage_orders" TO authenticated WITH CHECK ("brokerage_orders"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage orders" ON "brokerage_orders" TO authenticated USING ("brokerage_orders"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_orders"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage orders" ON "brokerage_orders" TO authenticated USING ("brokerage_orders"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" TO authenticated USING ("brokerage_portfolio_snapshots"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" TO authenticated WITH CHECK ("brokerage_portfolio_snapshots"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" TO authenticated USING ("brokerage_portfolio_snapshots"."user_id" = (SELECT auth.uid())) WITH CHECK ("brokerage_portfolio_snapshots"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" TO authenticated USING ("brokerage_portfolio_snapshots"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own app store subscriptions" ON "app_store_subscription" TO authenticated USING ("app_store_subscription"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own app store subscriptions" ON "app_store_subscription" TO authenticated WITH CHECK ("app_store_subscription"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own app store subscriptions" ON "app_store_subscription" TO authenticated USING ("app_store_subscription"."user_id" = (SELECT auth.uid())) WITH CHECK ("app_store_subscription"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own feedback" ON "feedback" TO authenticated USING ("feedback"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own feedback" ON "feedback" TO authenticated WITH CHECK ("feedback"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own feedback" ON "feedback" TO authenticated USING ("feedback"."user_id" = (SELECT auth.uid())) WITH CHECK ("feedback"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own feedback" ON "feedback" TO authenticated USING ("feedback"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own financial goals" ON "financial_goals" TO authenticated USING ("financial_goals"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own financial goals" ON "financial_goals" TO authenticated WITH CHECK ("financial_goals"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own financial goals" ON "financial_goals" TO authenticated USING ("financial_goals"."user_id" = (SELECT auth.uid())) WITH CHECK ("financial_goals"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own financial goals" ON "financial_goals" TO authenticated USING ("financial_goals"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can read own kalshi users" ON "kalshi_users" TO authenticated USING ("kalshi_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can insert own kalshi users" ON "kalshi_users" TO authenticated WITH CHECK ("kalshi_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can update own kalshi users" ON "kalshi_users" TO authenticated USING ("kalshi_users"."user_id" = (SELECT auth.uid())) WITH CHECK ("kalshi_users"."user_id" = (SELECT auth.uid()));--> statement-breakpoint
ALTER POLICY "authenticated can delete own kalshi users" ON "kalshi_users" TO authenticated USING ("kalshi_users"."user_id" = (SELECT auth.uid()));