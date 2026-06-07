CREATE TABLE "merchant_geocode_cache" (
	"city" text,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"merchant_name" text NOT NULL,
	"provider" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_friendship" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	CONSTRAINT "social_friendship_sorted_chk" CHECK ("user_a_id" < "user_b_id")
);
--> statement-breakpoint
CREATE TABLE "social_invite" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"inviter_user_id" text NOT NULL,
	"kind" text DEFAULT 'friendship' NOT NULL,
	"max_uses" integer DEFAULT 10 NOT NULL,
	"organization_id" text,
	"revoked_at" timestamp,
	"role" text,
	"target_email" text,
	"target_phone" text,
	"target_user_id" text,
	"token" text NOT NULL UNIQUE,
	"uses_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_invite_redemption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invite_id" uuid NOT NULL,
	"redeemed_at" timestamp DEFAULT now() NOT NULL,
	"redeemer_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_post" (
	"amount_bucket" text,
	"amount_cents" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date" timestamp NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"lat" double precision,
	"lon" double precision,
	"merchant_name" text NOT NULL,
	"note" text,
	"transaction_id" uuid NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_privacy_zone" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"label" text,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"radius_m" integer DEFAULT 200 NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_visibility_rule" (
	"auto_share" boolean DEFAULT false NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."bank_account";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."bank_account";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."bank_balance";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."bank_balance";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."bank_balance_snapshot";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."bank_balance_snapshot";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."bank_connection";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."bank_connection";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_account";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_account";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_account_detail";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_account_detail";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_activity";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_activity";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_authorization";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_authorization";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_balance";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_balance";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_order";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_order";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_position";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_position";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."brokerage_user";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."brokerage_user";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."credit_liability";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."credit_liability";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."investment_activity";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."investment_activity";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."investment_position";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."investment_position";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "archive"."investment_security";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."investment_security";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."mortgage_liability";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."mortgage_liability";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."portfolio_snapshot";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."portfolio_snapshot";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."recurring_stream";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."recurring_stream";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."student_loan_liability";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."student_loan_liability";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "archive"."transaction";--> statement-breakpoint
DROP POLICY "app_full_access" ON "archive"."transaction";--> statement-breakpoint
ALTER TABLE "oauth_access_token" RENAME CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" TO "oauth_access_token_client_id_oauth_client_client_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_access_token" RENAME CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" TO "oauth_access_token_refresh_id_oauth_refresh_token_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_access_token" RENAME CONSTRAINT "oauth_access_token_session_id_session_id_fk" TO "oauth_access_token_session_id_session_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_access_token" RENAME CONSTRAINT "oauth_access_token_user_id_user_id_fk" TO "oauth_access_token_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_client" RENAME CONSTRAINT "oauth_client_user_id_user_id_fk" TO "oauth_client_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_consent" RENAME CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" TO "oauth_consent_client_id_oauth_client_client_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_consent" RENAME CONSTRAINT "oauth_consent_user_id_user_id_fk" TO "oauth_consent_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" RENAME CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" TO "oauth_refresh_token_client_id_oauth_client_client_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" RENAME CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" TO "oauth_refresh_token_session_id_session_id_fkey";--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" RENAME CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" TO "oauth_refresh_token_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "account" RENAME CONSTRAINT "account_user_id_user_id_fk" TO "account_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "chats" RENAME CONSTRAINT "chats_user_id_user_id_fk" TO "chats_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "credit_liability" RENAME CONSTRAINT "credit_liability_v2_account_id_financial_account_id_fkey" TO "credit_liability_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "credit_liability" RENAME CONSTRAINT "credit_liability_v2_user_id_user_id_fkey" TO "credit_liability_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "event_articles" RENAME CONSTRAINT "event_articles_financial_event_id_financial_events_id_fk" TO "event_articles_financial_event_id_financial_events_id_fkey";--> statement-breakpoint
ALTER TABLE "feedback" RENAME CONSTRAINT "feedback_user_id_user_id_fk" TO "feedback_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "financial_goals" RENAME CONSTRAINT "financial_goals_user_id_user_id_fk" TO "financial_goals_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "investment_activity" RENAME CONSTRAINT "investment_activity_v2_account_id_financial_account_id_fkey" TO "investment_activity_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "investment_activity" RENAME CONSTRAINT "investment_activity_v2_security_id_security_id_fkey" TO "investment_activity_security_id_security_id_fkey";--> statement-breakpoint
ALTER TABLE "investment_activity" RENAME CONSTRAINT "investment_activity_v2_user_id_user_id_fkey" TO "investment_activity_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "kalshi_users" RENAME CONSTRAINT "kalshi_users_user_id_user_id_fk" TO "kalshi_users_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "message_votes" RENAME CONSTRAINT "message_votes_message_id_messages_message_id_fk" TO "message_votes_message_id_messages_message_id_fkey";--> statement-breakpoint
ALTER TABLE "message_votes" RENAME CONSTRAINT "message_votes_user_id_user_id_fk" TO "message_votes_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "messages" RENAME CONSTRAINT "messages_chat_id_chats_chat_id_fk" TO "messages_chat_id_chats_chat_id_fkey";--> statement-breakpoint
ALTER TABLE "mobile_subscription" RENAME CONSTRAINT "mobile_subscription_user_id_user_id_fk" TO "mobile_subscription_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "mortgage_liability" RENAME CONSTRAINT "mortgage_liability_v2_account_id_financial_account_id_fkey" TO "mortgage_liability_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "mortgage_liability" RENAME CONSTRAINT "mortgage_liability_v2_user_id_user_id_fkey" TO "mortgage_liability_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "parts" RENAME CONSTRAINT "parts_message_id_messages_message_id_fk" TO "parts_message_id_messages_message_id_fkey";--> statement-breakpoint
ALTER TABLE "recurring" RENAME CONSTRAINT "recurring_stream_v2_account_id_financial_account_id_fkey" TO "recurring_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "recurring" RENAME CONSTRAINT "recurring_stream_v2_user_id_user_id_fkey" TO "recurring_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "session" RENAME CONSTRAINT "session_user_id_user_id_fk" TO "session_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "student_loan_liability" RENAME CONSTRAINT "student_loan_liability_v2_account_id_financial_account_id_fkey" TO "student_loan_liability_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "student_loan_liability" RENAME CONSTRAINT "student_loan_liability_v2_user_id_user_id_fkey" TO "student_loan_liability_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "transaction" RENAME CONSTRAINT "transaction_v2_account_id_financial_account_id_fkey" TO "transaction_account_id_financial_account_id_fkey";--> statement-breakpoint
ALTER TABLE "transaction" RENAME CONSTRAINT "transaction_v2_user_id_user_id_fkey" TO "transaction_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "user_alerts" RENAME CONSTRAINT "user_alerts_user_id_user_id_fk" TO "user_alerts_user_id_user_id_fkey";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "credit_liability" RENAME CONSTRAINT "credit_liability_v2_pkey" TO "credit_liability_pkey";--> statement-breakpoint
ALTER TABLE "institution" RENAME CONSTRAINT "plaid_institutions_pkey" TO "institution_pkey";--> statement-breakpoint
ALTER TABLE "investment_activity" RENAME CONSTRAINT "investment_activity_v2_pkey" TO "investment_activity_pkey";--> statement-breakpoint
ALTER TABLE "mobile_subscription" RENAME CONSTRAINT "app_store_subscription_pkey" TO "mobile_subscription_pkey";--> statement-breakpoint
ALTER TABLE "mortgage_liability" RENAME CONSTRAINT "mortgage_liability_v2_pkey" TO "mortgage_liability_pkey";--> statement-breakpoint
ALTER TABLE "recurring" RENAME CONSTRAINT "recurring_stream_v2_pkey" TO "recurring_pkey";--> statement-breakpoint
ALTER TABLE "student_loan_liability" RENAME CONSTRAINT "student_loan_liability_v2_pkey" TO "student_loan_liability_pkey";--> statement-breakpoint
ALTER TABLE "transaction" RENAME CONSTRAINT "transaction_v2_pkey" TO "transaction_pkey";--> statement-breakpoint
ALTER TABLE "credit_liability" RENAME CONSTRAINT "credit_liability_v2_account_id_key" TO "credit_liability_account_id_key";--> statement-breakpoint
ALTER TABLE "financial_events" RENAME CONSTRAINT "financial_events_event_id_unique" TO "financial_events_event_id_key";--> statement-breakpoint
ALTER TABLE "institution" RENAME CONSTRAINT "institution_plaid_institution_id_unique" TO "institution_plaid_institution_id_key";--> statement-breakpoint
ALTER TABLE "mobile_subscription" RENAME CONSTRAINT "mobile_subscription_original_transaction_id_unique" TO "mobile_subscription_original_transaction_id_key";--> statement-breakpoint
ALTER TABLE "mortgage_liability" RENAME CONSTRAINT "mortgage_liability_v2_account_id_key" TO "mortgage_liability_account_id_key";--> statement-breakpoint
ALTER TABLE "rss_articles" RENAME CONSTRAINT "rss_articles_link_unique" TO "rss_articles_link_key";--> statement-breakpoint
ALTER TABLE "rss_feeds" RENAME CONSTRAINT "rss_feeds_url_unique" TO "rss_feeds_url_key";--> statement-breakpoint
ALTER TABLE "session" RENAME CONSTRAINT "session_token_unique" TO "session_token_key";--> statement-breakpoint
ALTER TABLE "student_loan_liability" RENAME CONSTRAINT "student_loan_liability_v2_account_id_key" TO "student_loan_liability_account_id_key";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "user_email_unique" TO "user_email_key";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "user_stripe_customer_id_unique" TO "user_stripe_customer_id_key";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_key" UNIQUE("phone_number");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_key" UNIQUE("username");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_geocode_cache_key_uq" ON "merchant_geocode_cache" ("merchant_name","city");--> statement-breakpoint
CREATE UNIQUE INDEX "social_friendship_pair_uq" ON "social_friendship" ("user_a_id","user_b_id");--> statement-breakpoint
CREATE INDEX "social_friendship_user_a_idx" ON "social_friendship" ("user_a_id");--> statement-breakpoint
CREATE INDEX "social_friendship_user_b_idx" ON "social_friendship" ("user_b_id");--> statement-breakpoint
CREATE INDEX "social_invite_inviter_idx" ON "social_invite" ("inviter_user_id");--> statement-breakpoint
CREATE INDEX "social_invite_token_idx" ON "social_invite" ("token");--> statement-breakpoint
CREATE INDEX "social_invite_kind_idx" ON "social_invite" ("kind");--> statement-breakpoint
CREATE INDEX "social_invite_target_user_idx" ON "social_invite" ("target_user_id");--> statement-breakpoint
CREATE INDEX "social_invite_target_email_idx" ON "social_invite" ("target_email");--> statement-breakpoint
CREATE INDEX "social_invite_target_phone_idx" ON "social_invite" ("target_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "social_invite_redemption_unique" ON "social_invite_redemption" ("invite_id","redeemer_user_id");--> statement-breakpoint
CREATE INDEX "social_invite_redemption_redeemer_idx" ON "social_invite_redemption" ("redeemer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_post_user_txn_uq" ON "social_post" ("user_id","transaction_id");--> statement-breakpoint
CREATE INDEX "social_post_user_idx" ON "social_post" ("user_id");--> statement-breakpoint
CREATE INDEX "social_post_lat_lon_idx" ON "social_post" ("lat","lon");--> statement-breakpoint
CREATE INDEX "social_privacy_zone_user_idx" ON "social_privacy_zone" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_visibility_rule_user_cat_uq" ON "social_visibility_rule" ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "user_username_idx" ON "user" ("username");--> statement-breakpoint
CREATE INDEX "user_phone_number_idx" ON "user" ("phone_number");--> statement-breakpoint
ALTER TABLE "social_friendship" ADD CONSTRAINT "social_friendship_user_a_id_user_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_friendship" ADD CONSTRAINT "social_friendship_user_b_id_user_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_invite" ADD CONSTRAINT "social_invite_inviter_user_id_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_invite" ADD CONSTRAINT "social_invite_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ADD CONSTRAINT "social_invite_redemption_invite_id_social_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "social_invite"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ADD CONSTRAINT "social_invite_redemption_redeemer_user_id_user_id_fkey" FOREIGN KEY ("redeemer_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_privacy_zone" ADD CONSTRAINT "social_privacy_zone_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_visibility_rule" ADD CONSTRAINT "social_visibility_rule_category_id_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_visibility_rule" ADD CONSTRAINT "social_visibility_rule_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "file_fields_required_if_type_is_file", ADD CONSTRAINT "file_fields_required_if_type_is_file" CHECK (CASE WHEN "type" = 'file' THEN "file_media_type" IS NOT NULL AND "file_url" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "reasoning_text_required_if_type_is_reasoning", ADD CONSTRAINT "reasoning_text_required_if_type_is_reasoning" CHECK (CASE WHEN "type" = 'reasoning' THEN "reasoning_text" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "source_document_fields_required_if_type_is_source_document", ADD CONSTRAINT "source_document_fields_required_if_type_is_source_document" CHECK (CASE WHEN "type" = 'source_document' THEN "source_document_source_id" IS NOT NULL AND "source_document_media_type" IS NOT NULL AND "source_document_title" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "source_url_fields_required_if_type_is_source_url", ADD CONSTRAINT "source_url_fields_required_if_type_is_source_url" CHECK (CASE WHEN "type" = 'source_url' THEN "source_url_source_id" IS NOT NULL AND "source_url_url" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "parts" DROP CONSTRAINT "text_text_required_if_type_is_text", ADD CONSTRAINT "text_text_required_if_type_is_text" CHECK (CASE WHEN "type" = 'text' THEN "text_text" IS NOT NULL ELSE TRUE END);--> statement-breakpoint
ALTER TABLE "financial_account" DROP CONSTRAINT "financial_account_connection_arc", ADD CONSTRAINT "financial_account_connection_arc" CHECK (num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1);--> statement-breakpoint
ALTER TABLE "tag" DROP CONSTRAINT "tag_color_check", ADD CONSTRAINT "tag_color_check" CHECK ("color" IN ('red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'slate', 'stone'));--> statement-breakpoint
ALTER TABLE "tag" DROP CONSTRAINT "tag_name_length_check", ADD CONSTRAINT "tag_name_length_check" CHECK (length("name") <= 50);