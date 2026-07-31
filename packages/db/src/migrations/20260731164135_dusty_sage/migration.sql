ALTER TABLE "jwks" ADD COLUMN "alg" text;--> statement-breakpoint
ALTER TABLE "jwks" ADD COLUMN "crv" text;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD COLUMN "authorization_code_id" text;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD COLUMN "confirmation" jsonb;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD COLUMN "requested_user_info_claims" text[];--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD COLUMN "resources" text[];--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD COLUMN "revoked" timestamp(6) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD COLUMN "backchannel_logout_session_required" boolean;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD COLUMN "backchannel_logout_uri" text;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD COLUMN "dpop_bound_access_tokens" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD COLUMN "requested_user_info_claims" text[];--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD COLUMN "resources" text[];--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "authorization_code_id" text;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "confirmation" jsonb;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "requested_user_info_claims" text[];--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "resources" text[];--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "rotated_at" timestamp(6) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "rotation_replay_expires_at" timestamp(6) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD COLUMN "rotation_replay_response" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "cancel_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "canceled_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "ended_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "stripe_schedule_id" text;--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_authorization_code_id_idx" ON "oauth_refresh_token" ("authorization_code_id");