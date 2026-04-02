CREATE TABLE "account_balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" text NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"current_balance" real NOT NULL,
	"available_balance" real,
	"credit_limit" real,
	"snapshot_source" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "balance_snapshots_account_id_idx" ON "account_balance_snapshots" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "balance_snapshots_date_idx" ON "account_balance_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "balance_snapshots_account_date_idx" ON "account_balance_snapshots" USING btree ("plaid_account_id","snapshot_date");--> statement-breakpoint
CREATE POLICY "auth_read_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "plaid_accounts"
        JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
        WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
        AND "plaid_items"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "auth_insert_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM "plaid_accounts"
        JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
        WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
        AND "plaid_items"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "auth_update_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
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
CREATE POLICY "auth_delete_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "plaid_accounts"
        JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
        WHERE "plaid_accounts"."plaid_account_id" = "account_balance_snapshots"."plaid_account_id"
        AND "plaid_items"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "webhook_read_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_balance_snapshots" ON "account_balance_snapshots" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);