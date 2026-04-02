CREATE TABLE "jwks" (
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jwks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_access_token" (
	"client_id" text NOT NULL,
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone NOT NULL,
	"id" text PRIMARY KEY,
	"reference_id" text,
	"refresh_id" text,
	"scopes" text[] NOT NULL,
	"session_id" text,
	"token" varchar(255) NOT NULL UNIQUE,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "oauth_access_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"client_id" varchar(255) NOT NULL UNIQUE,
	"client_secret" text,
	"contacts" text[],
	"created_at" timestamp(6) with time zone,
	"disabled" boolean,
	"enable_end_session" boolean,
	"grant_types" text[],
	"icon" text,
	"id" text PRIMARY KEY,
	"metadata" jsonb,
	"name" text,
	"policy" text,
	"post_logout_redirect_uris" text[],
	"public" boolean,
	"redirect_uris" text[] NOT NULL,
	"reference_id" text,
	"require_pkce" boolean,
	"response_types" text[],
	"scopes" text[],
	"skip_consent" boolean,
	"software_id" text,
	"software_statement" text,
	"software_version" text,
	"subject_type" text,
	"token_endpoint_auth_method" text,
	"tos" text,
	"type" text,
	"updated_at" timestamp(6) with time zone,
	"uri" text,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "oauth_client" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_consent" (
	"client_id" text NOT NULL,
	"created_at" timestamp(6) with time zone NOT NULL,
	"id" text PRIMARY KEY,
	"reference_id" text,
	"scopes" text[] NOT NULL,
	"updated_at" timestamp(6) with time zone NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_consent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_refresh_token" (
	"auth_time" timestamp(6) with time zone,
	"client_id" text NOT NULL,
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone NOT NULL,
	"id" text PRIMARY KEY,
	"reference_id" text,
	"revoked" timestamp(6) with time zone,
	"scopes" text[] NOT NULL,
	"session_id" text,
	"token" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "oauth_access_token_client_id_idx" ON "oauth_access_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_user_id_idx" ON "oauth_access_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_reference_id_idx" ON "oauth_access_token" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_refresh_id_idx" ON "oauth_access_token" ("refresh_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_session_id_idx" ON "oauth_access_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_client_user_id_idx" ON "oauth_client" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_client_client_id_idx" ON "oauth_client" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_client_reference_id_idx" ON "oauth_client" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_client_user_idx" ON "oauth_consent" ("client_id","user_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_reference_id_idx" ON "oauth_consent" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_client_id_idx" ON "oauth_refresh_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_user_id_idx" ON "oauth_refresh_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_reference_id_idx" ON "oauth_refresh_token" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_session_id_idx" ON "oauth_refresh_token" ("session_id");--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fkey" FOREIGN KEY ("refresh_id") REFERENCES "oauth_refresh_token"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "app_full_access" ON "jwks" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "oauth_access_token" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "oauth_access_token" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "oauth_client" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "oauth_consent" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "oauth_consent" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "oauth_refresh_token" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "oauth_refresh_token" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));