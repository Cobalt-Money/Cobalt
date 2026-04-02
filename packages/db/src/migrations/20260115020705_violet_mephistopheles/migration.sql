ALTER POLICY "authenticated can read messages from own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can insert messages to own chats" ON "messages" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can update messages in own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can delete messages from own chats" ON "messages" TO authenticated USING (EXISTS (
      SELECT 1 FROM "chats" 
      WHERE "chats"."chat_id" = "messages"."chat_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can read parts from own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can insert parts to own chats" ON "parts" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can update parts in own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "authenticated can delete parts from own chats" ON "parts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "messages" 
      JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
      WHERE "messages"."message_id" = "parts"."message_id" 
      AND "chats"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_read_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_insert_balance_snapshots" ON "account_balance_snapshots" TO authenticated WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_update_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_balance_snapshots" ON "account_balance_snapshots" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_accounts" ON "plaid_accounts" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_balances" ON "plaid_balances" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_recurring_streams" ON "plaid_recurring_streams" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_transactions" ON "plaid_transactions" TO authenticated USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));