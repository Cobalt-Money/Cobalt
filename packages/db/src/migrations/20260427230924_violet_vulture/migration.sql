DROP POLICY "app_full_access" ON "fundamentals";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "fundamentals";--> statement-breakpoint
DROP POLICY "app_full_access" ON "jwks";--> statement-breakpoint
DROP POLICY "app_full_access" ON "oauth_access_token";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "oauth_access_token";--> statement-breakpoint
DROP POLICY "app_full_access" ON "oauth_client";--> statement-breakpoint
DROP POLICY "app_full_access" ON "oauth_consent";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "oauth_consent";--> statement-breakpoint
DROP POLICY "app_full_access" ON "oauth_refresh_token";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "oauth_refresh_token";--> statement-breakpoint
DROP POLICY "app_full_access" ON "tickers";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "tickers";--> statement-breakpoint
DROP POLICY "app_full_access" ON "account";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "account";--> statement-breakpoint
DROP POLICY "app_full_access" ON "chats";--> statement-breakpoint
DROP POLICY "app_full_access" ON "event_articles";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "event_articles";--> statement-breakpoint
DROP POLICY "app_full_access" ON "feedback";--> statement-breakpoint
DROP POLICY "app_full_access" ON "financial_events";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "financial_events";--> statement-breakpoint
DROP POLICY "app_full_access" ON "financial_goals";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "financial_goals";--> statement-breakpoint
DROP POLICY "app_full_access" ON "institution";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "institution";--> statement-breakpoint
DROP POLICY "app_full_access" ON "kalshi_users";--> statement-breakpoint
DROP POLICY "app_full_access" ON "message_votes";--> statement-breakpoint
DROP POLICY "app_full_access" ON "messages";--> statement-breakpoint
DROP POLICY "app_full_access" ON "mobile_subscription";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "mobile_subscription";--> statement-breakpoint
DROP POLICY "app_full_access" ON "parts";--> statement-breakpoint
DROP POLICY "app_full_access" ON "rss_articles";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "rss_articles";--> statement-breakpoint
DROP POLICY "app_full_access" ON "rss_feeds";--> statement-breakpoint
DROP POLICY "agent_select_public" ON "rss_feeds";--> statement-breakpoint
DROP POLICY "app_full_access" ON "session";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "session";--> statement-breakpoint
DROP POLICY "app_full_access" ON "subscription";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "subscription";--> statement-breakpoint
DROP POLICY "app_full_access" ON "user";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "user";--> statement-breakpoint
DROP POLICY "app_full_access" ON "user_alerts";--> statement-breakpoint
DROP POLICY "agent_select_own" ON "user_alerts";--> statement-breakpoint
DROP POLICY "app_full_access" ON "verification";--> statement-breakpoint
ALTER TABLE "fundamentals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jwks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_access_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_client" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_consent" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tickers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_articles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "financial_goals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "institution" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "kalshi_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_votes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mobile_subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rss_articles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rss_feeds" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_alerts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "balance" RENAME COLUMN "limit" TO "credit_limit";--> statement-breakpoint
ALTER TABLE "balance" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "holding" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "investment_activity" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "security" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "snapshot" RENAME COLUMN "limit" TO "credit_limit";--> statement-breakpoint
ALTER TABLE "snapshot" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "transaction" RENAME COLUMN "iso_currency_code" TO "currency";--> statement-breakpoint
ALTER TABLE "balance" DROP COLUMN "unofficial_currency_code";--> statement-breakpoint
ALTER TABLE "holding" DROP COLUMN "unofficial_currency_code";--> statement-breakpoint
ALTER TABLE "investment_activity" DROP COLUMN "unofficial_currency_code";--> statement-breakpoint
ALTER TABLE "security" DROP COLUMN "unofficial_currency_code";--> statement-breakpoint
ALTER TABLE "security" DROP COLUMN "update_datetime";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "authorized_datetime";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "datetime";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "original_description";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "payment_meta";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "personal_finance_category_icon_url";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "transaction_type";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "unofficial_currency_code";--> statement-breakpoint
ALTER TABLE "financial_account" DROP COLUMN "last_sync_at";--> statement-breakpoint
ALTER TABLE "financial_account" DROP COLUMN "provider_created_at";--> statement-breakpoint
ALTER TABLE "financial_account" DROP COLUMN "sync_status";--> statement-breakpoint
ALTER TABLE "financial_account" DROP COLUMN "user_override_credit_limit";--> statement-breakpoint
ALTER TABLE "financial_account" DROP COLUMN "verification_status";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "is_user_modified";--> statement-breakpoint
ALTER TABLE "recurring" DROP COLUMN "last_user_modified_datetime";