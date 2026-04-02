CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"cancel_at_period_end" boolean,
	"seats" integer,
	"trial_start" timestamp,
	"trial_end" timestamp,
	CONSTRAINT "subscription_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_customer_id_idx" ON "subscription" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" USING btree ("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_stripe_customer_id_unique" UNIQUE("stripe_customer_id");--> statement-breakpoint
CREATE POLICY "authenticated can read own subscriptions" ON "subscription" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("subscription"."reference_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own subscriptions" ON "subscription" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("subscription"."reference_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own subscriptions" ON "subscription" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("subscription"."reference_id" = (select auth.uid())) WITH CHECK ("subscription"."reference_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own subscriptions" ON "subscription" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("subscription"."reference_id" = (select auth.uid()));