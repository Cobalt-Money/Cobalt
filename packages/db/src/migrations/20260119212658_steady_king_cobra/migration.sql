CREATE TABLE "app_store_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"original_transaction_id" text NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp,
	"environment" text NOT NULL,
	"latest_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_store_subscription_original_transaction_id_unique" UNIQUE("original_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "app_store_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_store_subscription" ADD CONSTRAINT "app_store_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_store_subscription_user_id_idx" ON "app_store_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_store_subscription_original_transaction_id_idx" ON "app_store_subscription" USING btree ("original_transaction_id");--> statement-breakpoint
CREATE INDEX "app_store_subscription_status_idx" ON "app_store_subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "financial_events_date_id_idx" ON "financial_events" USING btree ("date","id");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_id_idx" ON "financial_events" USING btree ("created_at","id");--> statement-breakpoint
CREATE POLICY "authenticated can read own app store subscriptions" ON "app_store_subscription" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("app_store_subscription"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own app store subscriptions" ON "app_store_subscription" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("app_store_subscription"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own app store subscriptions" ON "app_store_subscription" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("app_store_subscription"."user_id" = (select auth.uid())) WITH CHECK ("app_store_subscription"."user_id" = (select auth.uid()));