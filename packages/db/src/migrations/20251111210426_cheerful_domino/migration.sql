CREATE TABLE "kalshi_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"api_key_id" varchar NOT NULL,
	"private_key_pem" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"last_verified" timestamp
);
--> statement-breakpoint
ALTER TABLE "kalshi_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kalshi_users" ADD CONSTRAINT "kalshi_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kalshi_users_api_key_id_idx" ON "kalshi_users" USING btree ("api_key_id");--> statement-breakpoint
CREATE POLICY "authenticated can read own kalshi users" ON "kalshi_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("kalshi_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own kalshi users" ON "kalshi_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("kalshi_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own kalshi users" ON "kalshi_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("kalshi_users"."user_id" = (select auth.uid())) WITH CHECK ("kalshi_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own kalshi users" ON "kalshi_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("kalshi_users"."user_id" = (select auth.uid()));