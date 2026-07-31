CREATE TABLE "oauth_client_assertion" (
	"expires_at" timestamp(6) with time zone NOT NULL,
	"id" text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "oauth_client_resource" (
	"client_id" text NOT NULL,
	"created_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"metadata" jsonb,
	"resource_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_resource" (
	"access_token_ttl" integer,
	"allowed_scopes" text[],
	"created_at" timestamp(6) with time zone,
	"custom_claims" jsonb,
	"disabled" boolean DEFAULT false,
	"dpop_bound_access_tokens_required" boolean DEFAULT false,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL UNIQUE,
	"metadata" jsonb,
	"name" text NOT NULL,
	"policy_version" integer DEFAULT 1,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"updated_at" timestamp(6) with time zone
);
--> statement-breakpoint
-- drizzle-kit also proposed dropping event_articles, financial_events,
-- rss_articles and rss_feeds here. Those four were removed from the TS schema
-- at some earlier point without a migration, so every `generate` re-proposes
-- them; they are unrelated to this change. Deleted from this migration on
-- purpose — an OAuth fix should not drop tables as a side effect. All four are
-- empty in production (0 rows, checked before removing these statements), so
-- dropping them is safe whenever someone wants to, but it belongs in its own
-- migration. The snapshot beside this file already records them as absent, so
-- no future `generate` will ask about them again.
CREATE INDEX "oauth_client_resource_client_id_idx" ON "oauth_client_resource" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_client_resource_resource_id_idx" ON "oauth_client_resource" ("resource_id");--> statement-breakpoint
ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_dn2L1gs9Dolm_fkey" FOREIGN KEY ("resource_id") REFERENCES "oauth_resource"("identifier") ON DELETE CASCADE;