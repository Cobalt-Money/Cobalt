CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"id_token" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_account" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"mask" text,
	"name" text NOT NULL,
	"official_name" text,
	"plaid_account_id" text NOT NULL UNIQUE,
	"plaid_item_id" text NOT NULL,
	"subtype" varchar,
	"type" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verification_status" varchar
);
--> statement-breakpoint
ALTER TABLE "bank_account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_balance" (
	"available" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current" real NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"iso_currency_code" varchar,
	"limit" real,
	"plaid_account_id" text NOT NULL,
	"unofficial_currency_code" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_override_credit_limit" real
);
--> statement-breakpoint
ALTER TABLE "bank_balance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_balance_snapshot" (
	"available_balance" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"credit_limit" real,
	"current_balance" real NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plaid_account_id" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"snapshot_source" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_balance_snapshot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bank_connection" (
	"available_products" jsonb,
	"billed_products" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"error" jsonb,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution_id" text,
	"institution_logo" text,
	"institution_name" text,
	"new_accounts_available" boolean DEFAULT false NOT NULL,
	"pending_disconnect_at" timestamp,
	"plaid_access_token" text NOT NULL,
	"plaid_item_id" text NOT NULL UNIQUE,
	"recurring_updated_datetime" text,
	"transactions_cursor" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"webhook_url" text
);
--> statement-breakpoint
ALTER TABLE "bank_connection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_account_detail" (
	"account_id" uuid NOT NULL,
	"balance" jsonb,
	"brokerage_authorization_id" varchar NOT NULL,
	"cash_restrictions" jsonb,
	"created_at" timestamp NOT NULL,
	"created_date" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution_name" varchar,
	"last_sync" timestamp,
	"meta" jsonb,
	"name" varchar,
	"number" varchar,
	"portfolio_group" varchar,
	"raw_type" varchar,
	"snaptrade_account_id" varchar NOT NULL UNIQUE,
	"status" varchar,
	"sync_status" jsonb,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_account_detail" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_account" (
	"account_id" varchar NOT NULL UNIQUE,
	"account_number" varchar,
	"account_status" varchar,
	"account_type" varchar,
	"balance_data" jsonb,
	"brokerage_auth_id" uuid NOT NULL,
	"cash_restrictions" jsonb,
	"created_at" timestamp NOT NULL,
	"created_date" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution_name" varchar,
	"last_sync" timestamp,
	"meta_data" jsonb,
	"name" varchar,
	"portfolio_group" varchar,
	"sync_status" varchar,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_activity" (
	"account_id" uuid NOT NULL,
	"activity_id" varchar NOT NULL UNIQUE,
	"amount" numeric(15,2),
	"created_at" timestamp NOT NULL,
	"currency_code" varchar,
	"currency_id" varchar,
	"currency_name" varchar,
	"description" text,
	"exchange_code" varchar,
	"exchange_id" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"external_reference_id" varchar,
	"fee" numeric(15,2),
	"figi_code" varchar,
	"fx_rate" numeric(15,6),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution" varchar,
	"last_sync" timestamp,
	"option_symbol" jsonb,
	"option_type" varchar,
	"pagination" jsonb,
	"price" numeric(15,4),
	"raw_symbol" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"security_type_id" varchar,
	"settlement_date" date,
	"snap_trade_account_id" varchar NOT NULL,
	"symbol" jsonb,
	"symbol_description" varchar,
	"symbol_id" varchar,
	"symbol_ticker" varchar,
	"trade_date" date,
	"type" varchar,
	"units" numeric(15,6),
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_authorization" (
	"authorization_id" varchar NOT NULL UNIQUE,
	"brokerage" varchar NOT NULL,
	"brokerage_slug" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"disabled_at" timestamp,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_disabled" integer,
	"is_eligible_for_payout" integer,
	"meta" jsonb,
	"name" varchar NOT NULL,
	"type" varchar,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_authorization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_balance" (
	"account_id" uuid NOT NULL,
	"buying_power" numeric(15,2),
	"cash" numeric(15,2),
	"created_at" timestamp NOT NULL,
	"currency_code" varchar,
	"currency_id" varchar,
	"currency_name" varchar,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"last_sync" timestamp,
	"snaptrade_account_id" varchar NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_balance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_order" (
	"account_id" uuid NOT NULL,
	"action" varchar,
	"brokerage_order_id" varchar NOT NULL UNIQUE,
	"canceled_quantity" numeric(15,6),
	"child_brokerage_order_ids" jsonb,
	"created_at" timestamp NOT NULL,
	"currency_code" varchar,
	"currency_id" varchar,
	"currency_name" varchar,
	"exchange_code" varchar,
	"exchange_id" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"execution_price" numeric(15,2),
	"expiration_date" timestamp,
	"expiry_date" timestamp,
	"figi_code" varchar,
	"filled_quantity" numeric(15,6),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_mini_option" boolean,
	"last_sync" timestamp,
	"limit_price" numeric(15,2),
	"open_quantity" numeric(15,6),
	"option_symbol" jsonb,
	"option_type" varchar,
	"order_type" varchar,
	"quote_currency" jsonb,
	"quote_universal_symbol" jsonb,
	"raw_symbol" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"security_type_id" varchar,
	"snap_trade_account_id" varchar NOT NULL,
	"status" varchar,
	"stop_price" numeric(15,2),
	"strike_price" numeric(15,2),
	"symbol" varchar,
	"symbol_description" varchar,
	"symbol_id" varchar,
	"time_executed" timestamp,
	"time_in_force" varchar,
	"time_placed" timestamp,
	"time_updated" timestamp,
	"total_quantity" numeric(15,6),
	"universal_symbol" jsonb,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_order" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_position" (
	"account_id" uuid NOT NULL,
	"average_purchase_price" numeric(15,4),
	"created_at" timestamp NOT NULL,
	"currency_code" varchar,
	"currency_id" varchar,
	"currency_name" varchar,
	"exchange_code" varchar,
	"exchange_id" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"figi_code" varchar,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_quotable" boolean,
	"is_tradable" boolean,
	"last_sync" timestamp,
	"local_id" varchar,
	"open_pnl" numeric(15,2),
	"price" numeric(15,2),
	"raw_symbol" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"security_type_id" varchar,
	"snap_trade_account_id" varchar NOT NULL,
	"symbol" varchar,
	"symbol_description" varchar,
	"symbol_id" varchar,
	"units" numeric(15,6),
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_position" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_user" (
	"created_at" timestamp NOT NULL,
	"last_verified_at" timestamp,
	"snaptrade_user_id" varchar NOT NULL UNIQUE,
	"snaptrade_user_secret" varchar NOT NULL,
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
ALTER TABLE "brokerage_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chats" (
	"chat_id" varchar PRIMARY KEY,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_liability" (
	"aprs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_overdue" boolean DEFAULT false NOT NULL,
	"last_payment_amount" real,
	"last_payment_date" text,
	"last_statement_balance" real,
	"last_statement_issue_date" text,
	"minimum_payment_amount" real,
	"next_payment_due_date" text,
	"plaid_account_id" text NOT NULL UNIQUE,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_liability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_articles" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date" timestamp,
	"financial_event_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"image_url" text,
	"news_url" text NOT NULL,
	"sentiment" varchar,
	"source_name" varchar,
	"text" text,
	"tickers" jsonb,
	"title" text NOT NULL,
	"topics" jsonb,
	"type" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM ('general', 'bug', 'feature');--> statement-breakpoint
CREATE TABLE "feedback" (
	"contact_email" text,
	"contact_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message" text NOT NULL,
	"subject" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_events" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date" timestamp,
	"event_id" varchar NOT NULL UNIQUE,
	"event_name" text NOT NULL,
	"event_text" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key_points" jsonb,
	"news_items" integer DEFAULT 0 NOT NULL,
	"scraped_articles_count" integer DEFAULT 0 NOT NULL,
	"sentiment" varchar,
	"summary" text,
	"tickers" jsonb,
	"topics" jsonb DEFAULT '["other"]',
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"icon" varchar DEFAULT 'target' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar NOT NULL,
	"target_amount" numeric(15,2) NOT NULL,
	"target_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "institution" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"logo" text,
	"name" text NOT NULL,
	"oauth" boolean DEFAULT false NOT NULL,
	"plaid_institution_id" text NOT NULL UNIQUE,
	"primary_color" text,
	"routing_numbers" jsonb,
	"status" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"url" text
);
--> statement-breakpoint
ALTER TABLE "institution" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "investment_activity" (
	"amount" real NOT NULL,
	"cancel_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" text NOT NULL,
	"fees" real,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"investment_transaction_id" text NOT NULL UNIQUE,
	"iso_currency_code" varchar,
	"name" text NOT NULL,
	"plaid_account_id" text NOT NULL,
	"price" real NOT NULL,
	"quantity" real NOT NULL,
	"security_id" text,
	"subtype" varchar NOT NULL,
	"type" varchar NOT NULL,
	"unofficial_currency_code" varchar
);
--> statement-breakpoint
ALTER TABLE "investment_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "investment_position" (
	"cost_basis" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution_price" real NOT NULL,
	"institution_price_as_of" text,
	"institution_price_datetime" text,
	"institution_value" real NOT NULL,
	"iso_currency_code" varchar,
	"plaid_account_id" text NOT NULL,
	"quantity" real NOT NULL,
	"security_id" text NOT NULL,
	"unofficial_currency_code" varchar,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vested_quantity" real,
	"vested_value" real
);
--> statement-breakpoint
ALTER TABLE "investment_position" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "investment_security" (
	"close_price" real,
	"close_price_as_of" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cusip" text,
	"fixed_income" jsonb,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"industry" varchar,
	"institution_id" text,
	"institution_security_id" text,
	"is_cash_equivalent" boolean,
	"isin" text,
	"iso_currency_code" varchar,
	"market_identifier_code" varchar,
	"name" text,
	"option_contract" jsonb,
	"proxy_security_id" text,
	"sector" varchar,
	"security_id" text NOT NULL UNIQUE,
	"sedol" text,
	"subtype" varchar,
	"ticker_symbol" varchar,
	"type" varchar,
	"unofficial_currency_code" varchar,
	"update_datetime" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_security" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kalshi_users" (
	"api_key_id" varchar NOT NULL,
	"created_at" timestamp NOT NULL,
	"last_verified_at" timestamp,
	"private_key_pem" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
ALTER TABLE "kalshi_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message_votes" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message_id" varchar NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"vote" varchar NOT NULL,
	CONSTRAINT "message_votes_user_message_unique" UNIQUE("user_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "message_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"chat_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"message_id" varchar PRIMARY KEY,
	"role" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mobile_subscription" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"environment" text NOT NULL,
	"expires_at" timestamp,
	"id" text PRIMARY KEY,
	"latest_transaction_id" text,
	"original_transaction_id" text NOT NULL UNIQUE,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mobile_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mortgage_liability" (
	"account_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current_late_fee" real,
	"escrow_balance" real,
	"has_pmi" boolean,
	"has_prepayment_penalty" boolean,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"interest_rate" jsonb,
	"last_payment_amount" real,
	"last_payment_date" text,
	"loan_term" text,
	"loan_type_description" text,
	"maturity_date" text,
	"next_monthly_payment" real,
	"next_payment_due_date" text,
	"origination_date" text,
	"origination_principal_amount" real,
	"past_due_amount" real,
	"plaid_account_id" text NOT NULL UNIQUE,
	"property_address" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ytd_interest_paid" real,
	"ytd_principal_paid" real
);
--> statement-breakpoint
ALTER TABLE "mortgage_liability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parts" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data" jsonb,
	"file_filename" varchar,
	"file_media_type" varchar,
	"file_url" varchar,
	"message_id" varchar NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"part_id" varchar PRIMARY KEY,
	"provider_metadata" jsonb,
	"reasoning_text" text,
	"source_document_filename" varchar,
	"source_document_media_type" varchar,
	"source_document_source_id" varchar,
	"source_document_title" varchar,
	"source_url_source_id" varchar,
	"source_url_title" varchar,
	"source_url_url" varchar,
	"text_text" text,
	"tool_error_text" varchar,
	"tool_input" jsonb,
	"tool_output" jsonb,
	"tool_state" varchar,
	"tool_call_id" varchar,
	"type" varchar NOT NULL,
	CONSTRAINT "text_text_required_if_type_is_text" CHECK (CASE WHEN "type" = 'text' THEN "text_text" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "reasoning_text_required_if_type_is_reasoning" CHECK (CASE WHEN "type" = 'reasoning' THEN "reasoning_text" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "file_fields_required_if_type_is_file" CHECK (CASE WHEN "type" = 'file' THEN "file_media_type" IS NOT NULL AND "file_url" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "source_url_fields_required_if_type_is_source_url" CHECK (CASE WHEN "type" = 'source_url' THEN "source_url_source_id" IS NOT NULL AND "source_url_url" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "source_document_fields_required_if_type_is_source_document" CHECK (CASE WHEN "type" = 'source_document' THEN "source_document_source_id" IS NOT NULL AND "source_document_media_type" IS NOT NULL AND "source_document_title" IS NOT NULL ELSE TRUE END)
);
--> statement-breakpoint
ALTER TABLE "parts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portfolio_snapshot" (
	"account_id" varchar NOT NULL,
	"account_name" varchar,
	"account_type" varchar NOT NULL,
	"buying_power" numeric(15,2),
	"cash_value" numeric(15,2),
	"created_at" timestamp NOT NULL,
	"currency_code" varchar NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"institution_name" varchar,
	"positions_count" integer,
	"positions_value" numeric(15,2),
	"raw_balance_data" jsonb,
	"snaptrade_account_id" varchar,
	"snapshot_date" date NOT NULL,
	"total_value" numeric(15,2),
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_snapshot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurring_stream" (
	"average_amount" real NOT NULL,
	"category" jsonb,
	"category_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"first_date" text NOT NULL,
	"frequency" varchar NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_user_modified" boolean DEFAULT false NOT NULL,
	"last_amount" real NOT NULL,
	"last_date" text NOT NULL,
	"last_user_modified_datetime" text,
	"merchant_name" text,
	"personal_finance_category" jsonb,
	"plaid_account_id" text NOT NULL,
	"predicted_next_date" text,
	"status" varchar NOT NULL,
	"stream_id" text NOT NULL UNIQUE,
	"stream_type" varchar NOT NULL,
	"transaction_ids" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_stream" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rss_articles" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"feed_ids" jsonb NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"link" text NOT NULL UNIQUE,
	"metadata" jsonb,
	"published_date" timestamp,
	"title" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rss_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"category" text NOT NULL,
	"company" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"fetch_interval_minutes" varchar DEFAULT '5',
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched" timestamp,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"url" text NOT NULL UNIQUE
);
--> statement-breakpoint
ALTER TABLE "rss_feeds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"ip_address" text,
	"token" text NOT NULL UNIQUE,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "student_loan_liability" (
	"account_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"disbursement_dates" jsonb,
	"expected_payoff_date" text,
	"guarantor" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"interest_rate_percentage" real,
	"is_overdue" boolean,
	"last_payment_amount" real,
	"last_payment_date" text,
	"last_statement_balance" real,
	"last_statement_issue_date" text,
	"loan_name" text,
	"loan_status" jsonb,
	"minimum_payment_amount" real,
	"next_payment_due_date" text,
	"origination_date" text,
	"origination_principal_amount" real,
	"outstanding_interest_amount" real,
	"payment_reference_number" text,
	"plaid_account_id" text NOT NULL UNIQUE,
	"pslf_status" jsonb,
	"repayment_plan" jsonb,
	"sequence_number" text,
	"servicer_address" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ytd_interest_paid" real,
	"ytd_principal_paid" real
);
--> statement-breakpoint
ALTER TABLE "student_loan_liability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscription" (
	"cancel_at_period_end" boolean,
	"id" text PRIMARY KEY,
	"period_end" timestamp,
	"period_start" timestamp,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"seats" integer,
	"status" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_end" timestamp,
	"trial_start" timestamp
);
--> statement-breakpoint
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction" (
	"account_owner" text,
	"amount" real NOT NULL,
	"authorized_date" date,
	"authorized_datetime" text,
	"category" jsonb,
	"category_id" text,
	"check_number" text,
	"counterparties" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"datetime" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"iso_currency_code" varchar,
	"location" jsonb,
	"logo_url" text,
	"merchant_entity_id" text,
	"merchant_name" text,
	"name" text NOT NULL,
	"original_description" text,
	"payment_channel" varchar,
	"payment_meta" jsonb,
	"pending" boolean DEFAULT false NOT NULL,
	"pending_transaction_id" text,
	"personal_finance_category" jsonb,
	"personal_finance_category_icon_url" text,
	"plaid_account_id" text NOT NULL,
	"plaid_transaction_id" text NOT NULL UNIQUE,
	"transaction_code" text,
	"transaction_type" varchar,
	"unofficial_currency_code" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_override_category" jsonb,
	"user_override_date" date,
	"user_override_name" text,
	"website" text
);
--> statement-breakpoint
ALTER TABLE "transaction" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text UNIQUE,
	"email_verified" boolean NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"last_seen_at" timestamp,
	"name" text NOT NULL,
	"stripe_customer_id" text UNIQUE,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_alerts" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message" text,
	"metadata" jsonb,
	"resolved_at" timestamp,
	"source" text NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'unread' NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "bank_account_connection_id_idx" ON "bank_account" ("plaid_item_id");--> statement-breakpoint
CREATE INDEX "bank_account_connection_type_idx" ON "bank_account" ("plaid_item_id","type");--> statement-breakpoint
CREATE INDEX "bank_balance_account_id_idx" ON "bank_balance" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "bank_balance_updated_at_idx" ON "bank_balance" ("updated_at");--> statement-breakpoint
CREATE INDEX "bank_balance_account_updated_idx" ON "bank_balance" ("plaid_account_id","updated_at");--> statement-breakpoint
CREATE INDEX "bank_balance_snapshot_account_id_idx" ON "bank_balance_snapshot" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "bank_balance_snapshot_date_idx" ON "bank_balance_snapshot" ("snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_balance_snapshot_account_date_idx" ON "bank_balance_snapshot" ("plaid_account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "bank_connection_institution_id_idx" ON "bank_connection" ("institution_id");--> statement-breakpoint
CREATE INDEX "bank_connection_user_institution_idx" ON "bank_connection" ("user_id","institution_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_detail_account_id_idx" ON "brokerage_account_detail" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_detail_user_id_idx" ON "brokerage_account_detail" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_detail_snaptrade_account_id_idx" ON "brokerage_account_detail" ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_detail_brokerage_authorization_id_idx" ON "brokerage_account_detail" ("brokerage_authorization_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_user_id_idx" ON "brokerage_account" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_brokerage_auth_id_idx" ON "brokerage_account" ("brokerage_auth_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_account_id_idx" ON "brokerage_account" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_sync_status_idx" ON "brokerage_account" ("sync_status");--> statement-breakpoint
CREATE INDEX "brokerage_account_account_status_idx" ON "brokerage_account" ("account_status");--> statement-breakpoint
CREATE INDEX "brokerage_activity_account_id_idx" ON "brokerage_activity" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_activity_user_id_idx" ON "brokerage_activity" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_activity_activity_id_idx" ON "brokerage_activity" ("activity_id");--> statement-breakpoint
CREATE INDEX "brokerage_activity_snap_trade_account_id_idx" ON "brokerage_activity" ("snap_trade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_activity_type_idx" ON "brokerage_activity" ("type");--> statement-breakpoint
CREATE INDEX "brokerage_activity_symbol_ticker_idx" ON "brokerage_activity" ("symbol_ticker");--> statement-breakpoint
CREATE INDEX "brokerage_activity_trade_date_idx" ON "brokerage_activity" ("trade_date");--> statement-breakpoint
CREATE INDEX "brokerage_activity_settlement_date_idx" ON "brokerage_activity" ("settlement_date");--> statement-breakpoint
CREATE INDEX "brokerage_activity_user_trade_date_idx" ON "brokerage_activity" ("user_id","trade_date");--> statement-breakpoint
CREATE INDEX "brokerage_auth_user_id_idx" ON "brokerage_authorization" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_auth_brokerage_slug_idx" ON "brokerage_authorization" ("brokerage_slug");--> statement-breakpoint
CREATE INDEX "brokerage_auth_authorization_id_idx" ON "brokerage_authorization" ("authorization_id");--> statement-breakpoint
CREATE INDEX "brokerage_auth_is_disabled_idx" ON "brokerage_authorization" ("is_disabled");--> statement-breakpoint
CREATE INDEX "brokerage_balance_account_id_idx" ON "brokerage_balance" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_balance_user_id_idx" ON "brokerage_balance" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_balance_snaptrade_account_id_idx" ON "brokerage_balance" ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_balance_currency_code_idx" ON "brokerage_balance" ("currency_code");--> statement-breakpoint
CREATE UNIQUE INDEX "brokerage_balance_account_currency_idx" ON "brokerage_balance" ("account_id","currency_code");--> statement-breakpoint
CREATE INDEX "brokerage_order_account_id_idx" ON "brokerage_order" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_order_user_id_idx" ON "brokerage_order" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_order_brokerage_order_id_idx" ON "brokerage_order" ("brokerage_order_id");--> statement-breakpoint
CREATE INDEX "brokerage_order_snap_trade_account_id_idx" ON "brokerage_order" ("snap_trade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_order_status_idx" ON "brokerage_order" ("status");--> statement-breakpoint
CREATE INDEX "brokerage_order_symbol_idx" ON "brokerage_order" ("symbol");--> statement-breakpoint
CREATE INDEX "brokerage_order_time_placed_idx" ON "brokerage_order" ("time_placed");--> statement-breakpoint
CREATE INDEX "brokerage_position_account_id_idx" ON "brokerage_position" ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_position_user_id_idx" ON "brokerage_position" ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_position_symbol_idx" ON "brokerage_position" ("symbol");--> statement-breakpoint
CREATE INDEX "brokerage_position_snap_trade_account_id_idx" ON "brokerage_position" ("snap_trade_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brokerage_position_account_symbol_idx" ON "brokerage_position" ("account_id","symbol");--> statement-breakpoint
CREATE INDEX "brokerage_user_snaptrade_user_id_idx" ON "brokerage_user" ("snaptrade_user_id");--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" ("user_id");--> statement-breakpoint
CREATE INDEX "chats_updated_at_idx" ON "chats" ("updated_at");--> statement-breakpoint
CREATE INDEX "chats_chat_id_updated_at_idx" ON "chats" ("chat_id","updated_at");--> statement-breakpoint
CREATE INDEX "event_articles_financial_event_id_idx" ON "event_articles" ("financial_event_id");--> statement-breakpoint
CREATE INDEX "event_articles_news_url_idx" ON "event_articles" ("news_url");--> statement-breakpoint
CREATE INDEX "event_articles_source_name_idx" ON "event_articles" ("source_name");--> statement-breakpoint
CREATE INDEX "event_articles_date_idx" ON "event_articles" ("date");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "feedback" ("type");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" ("created_at");--> statement-breakpoint
CREATE INDEX "financial_events_event_id_idx" ON "financial_events" ("event_id");--> statement-breakpoint
CREATE INDEX "financial_events_date_idx" ON "financial_events" ("date");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_idx" ON "financial_events" ("created_at");--> statement-breakpoint
CREATE INDEX "financial_events_sentiment_idx" ON "financial_events" ("sentiment");--> statement-breakpoint
CREATE INDEX "financial_events_date_id_idx" ON "financial_events" ("date","id");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_id_idx" ON "financial_events" ("created_at","id");--> statement-breakpoint
CREATE INDEX "financial_events_tickers_idx" ON "financial_events" USING gin ("tickers");--> statement-breakpoint
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_goals_created_at_idx" ON "financial_goals" ("created_at");--> statement-breakpoint
CREATE INDEX "institution_provider_id_idx" ON "institution" ("plaid_institution_id");--> statement-breakpoint
CREATE INDEX "institution_name_idx" ON "institution" ("name");--> statement-breakpoint
CREATE INDEX "investment_activity_account_idx" ON "investment_activity" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "investment_activity_date_idx" ON "investment_activity" ("date");--> statement-breakpoint
CREATE INDEX "investment_activity_account_date_idx" ON "investment_activity" ("plaid_account_id","date");--> statement-breakpoint
CREATE INDEX "investment_activity_security_idx" ON "investment_activity" ("security_id");--> statement-breakpoint
CREATE INDEX "investment_activity_type_idx" ON "investment_activity" ("type");--> statement-breakpoint
CREATE INDEX "investment_position_account_idx" ON "investment_position" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "investment_position_security_idx" ON "investment_position" ("security_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_position_account_security_idx" ON "investment_position" ("plaid_account_id","security_id");--> statement-breakpoint
CREATE INDEX "investment_security_ticker_idx" ON "investment_security" ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "investment_security_type_idx" ON "investment_security" ("type");--> statement-breakpoint
CREATE INDEX "investment_security_sector_idx" ON "investment_security" ("sector");--> statement-breakpoint
CREATE INDEX "kalshi_users_api_key_id_idx" ON "kalshi_users" ("api_key_id");--> statement-breakpoint
CREATE INDEX "message_votes_user_id_idx" ON "message_votes" ("user_id");--> statement-breakpoint
CREATE INDEX "message_votes_message_id_idx" ON "message_votes" ("message_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" ("chat_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "mobile_subscription_user_id_idx" ON "mobile_subscription" ("user_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_original_transaction_id_idx" ON "mobile_subscription" ("original_transaction_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_status_idx" ON "mobile_subscription" ("status");--> statement-breakpoint
CREATE INDEX "parts_message_id_idx" ON "parts" ("message_id");--> statement-breakpoint
CREATE INDEX "parts_message_id_order_idx" ON "parts" ("message_id","order");--> statement-breakpoint
CREATE INDEX "portfolio_snapshot_user_id_idx" ON "portfolio_snapshot" ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshot_account_id_idx" ON "portfolio_snapshot" ("account_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshot_snaptrade_account_id_idx" ON "portfolio_snapshot" ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshot_snapshot_date_idx" ON "portfolio_snapshot" ("snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_snapshot_account_date_idx" ON "portfolio_snapshot" ("account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "recurring_stream_account_id_idx" ON "recurring_stream" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "recurring_stream_account_date_type_idx" ON "recurring_stream" ("plaid_account_id","last_date","stream_type");--> statement-breakpoint
CREATE INDEX "rss_articles_link_where_idx" ON "rss_articles" ("link");--> statement-breakpoint
CREATE INDEX "rss_articles_published_date_idx" ON "rss_articles" ("published_date");--> statement-breakpoint
CREATE INDEX "rss_articles_created_at_idx" ON "rss_articles" ("created_at");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_idx" ON "rss_feeds" ("company");--> statement-breakpoint
CREATE INDEX "rss_feeds_category_idx" ON "rss_feeds" ("category");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_category_idx" ON "rss_feeds" ("company","category");--> statement-breakpoint
CREATE INDEX "rss_feeds_url_idx" ON "rss_feeds" ("url");--> statement-breakpoint
CREATE INDEX "rss_feeds_is_active_idx" ON "rss_feeds" ("is_active");--> statement-breakpoint
CREATE INDEX "rss_feeds_last_fetched_idx" ON "rss_feeds" ("last_fetched");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_customer_id_idx" ON "subscription" ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "transaction_account_id_idx" ON "transaction" ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "transaction" ("date");--> statement-breakpoint
CREATE INDEX "transaction_account_date_idx" ON "transaction" ("plaid_account_id","date");--> statement-breakpoint
CREATE INDEX "transaction_pending_idx" ON "transaction" ("pending");--> statement-breakpoint
CREATE INDEX "transaction_date_pending_idx" ON "transaction" ("date","pending");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
CREATE INDEX "user_alerts_user_id_status_idx" ON "user_alerts" ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_alerts_source_source_id_idx" ON "user_alerts" ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_alerts_active_dedup_idx" ON "user_alerts" ("source","source_id","type") WHERE status NOT IN ('resolved', 'dismissed');--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_plaid_item_id_bank_connection_plaid_item_id_fkey" FOREIGN KEY ("plaid_item_id") REFERENCES "bank_connection"("plaid_item_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bank_balance" ADD CONSTRAINT "bank_balance_RvIOD7h94z6o_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bank_balance_snapshot" ADD CONSTRAINT "bank_balance_snapshot_QYTTfbgvPA9R_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bank_connection" ADD CONSTRAINT "bank_connection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_account_detail" ADD CONSTRAINT "brokerage_account_detail_account_id_brokerage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "brokerage_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_account_detail" ADD CONSTRAINT "brokerage_account_detail_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_account" ADD CONSTRAINT "brokerage_account_G6ZVQ2Ub74LN_fkey" FOREIGN KEY ("brokerage_auth_id") REFERENCES "brokerage_authorization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_account" ADD CONSTRAINT "brokerage_account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_activity" ADD CONSTRAINT "brokerage_activity_account_id_brokerage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "brokerage_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_activity" ADD CONSTRAINT "brokerage_activity_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_authorization" ADD CONSTRAINT "brokerage_authorization_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_balance" ADD CONSTRAINT "brokerage_balance_account_id_brokerage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "brokerage_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_balance" ADD CONSTRAINT "brokerage_balance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_order" ADD CONSTRAINT "brokerage_order_account_id_brokerage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "brokerage_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_order" ADD CONSTRAINT "brokerage_order_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_position" ADD CONSTRAINT "brokerage_position_account_id_brokerage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "brokerage_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_position" ADD CONSTRAINT "brokerage_position_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_user" ADD CONSTRAINT "brokerage_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_liability" ADD CONSTRAINT "credit_liability_wjlbhVNb1pnG_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_financial_event_id_financial_events_id_fkey" FOREIGN KEY ("financial_event_id") REFERENCES "financial_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_cLCTqfa9DTvu_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_DeRnnTGDUj0E_fkey" FOREIGN KEY ("security_id") REFERENCES "investment_security"("security_id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "investment_position" ADD CONSTRAINT "investment_position_HbVpH0gsVIg0_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_position" ADD CONSTRAINT "investment_position_7F9TEEMXc7La_fkey" FOREIGN KEY ("security_id") REFERENCES "investment_security"("security_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kalshi_users" ADD CONSTRAINT "kalshi_users_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_message_id_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("chat_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mobile_subscription" ADD CONSTRAINT "mobile_subscription_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mortgage_liability" ADD CONSTRAINT "mortgage_liability_WiGtmo2UKi87_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_message_id_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "portfolio_snapshot" ADD CONSTRAINT "portfolio_snapshot_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring_stream" ADD CONSTRAINT "recurring_stream_4FObJB73QTwv_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_loan_liability" ADD CONSTRAINT "student_loan_liability_4NwbkaNvXz3D_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_plaid_account_id_bank_account_plaid_account_id_fkey" FOREIGN KEY ("plaid_account_id") REFERENCES "bank_account"("plaid_account_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "app_full_access" ON "account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "account" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "bank_account" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_connection
      WHERE bank_connection.plaid_item_id = "bank_account"."plaid_item_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "bank_balance" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "bank_balance"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_balance_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "bank_balance_snapshot" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "bank_balance_snapshot"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "bank_connection" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "bank_connection" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_account_detail" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_account_detail" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_account" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_activity" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_authorization" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_authorization" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_balance" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_order" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_order" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_position" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "brokerage_user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "brokerage_user" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "chats" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "credit_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "credit_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "credit_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "event_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "event_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "feedback" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_events" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "financial_events" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "financial_goals" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "financial_goals" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "institution" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "institution" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "investment_activity" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "investment_activity"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "investment_position" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "investment_position"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "investment_security" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "investment_security" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "kalshi_users" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "message_votes" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "messages" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "mobile_subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "mobile_subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "mortgage_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "mortgage_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "mortgage_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "parts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "portfolio_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "portfolio_snapshot" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "recurring_stream" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "recurring_stream" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "recurring_stream"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_articles" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_articles" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "rss_feeds" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "rss_feeds" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "session" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "session" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "student_loan_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "student_loan_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "student_loan_liability"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "subscription" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "subscription" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "reference_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "transaction" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "transaction" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR EXISTS (
      SELECT 1 FROM bank_account
      JOIN bank_connection ON bank_connection.plaid_item_id = bank_account.plaid_item_id
      WHERE bank_account.plaid_account_id = "transaction"."plaid_account_id"
      AND bank_connection.user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
    ));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "user" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "user_alerts" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "user_alerts" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (current_setting('request.jwt.claims', true) IS NULL OR "user_id" = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "verification" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);