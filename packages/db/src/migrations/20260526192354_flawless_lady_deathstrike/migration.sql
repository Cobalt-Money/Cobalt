-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "feedback_type" AS ENUM('general', 'bug', 'feature');--> statement-breakpoint
CREATE TYPE "account_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "activity_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "security_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "transaction_source" AS ENUM('plaid', 'manual');--> statement-breakpoint
CREATE TYPE "transaction_edit_actor" AS ENUM('system', 'user');--> statement-breakpoint
CREATE TYPE "import_job_status" AS ENUM('uploaded', 'column_mapped', 'account_mapped', 'category_mapped', 'committing', 'committed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "import_source" AS ENUM('csv');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_mapping_cache" (
	"cobalt_account_id" uuid,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_label" text,
	"user_id" text,
	CONSTRAINT "account_mapping_cache_pkey" PRIMARY KEY("user_id","source_label")
);
--> statement-breakpoint
CREATE TABLE "apikey" (
	"config_id" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp NOT NULL,
	"enabled" boolean DEFAULT true,
	"expires_at" timestamp,
	"id" text PRIMARY KEY,
	"key" text NOT NULL,
	"last_refill_at" timestamp,
	"last_request" timestamp,
	"metadata" text,
	"name" text,
	"permissions" text,
	"prefix" text,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_max" integer DEFAULT 10000,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"reference_id" text NOT NULL,
	"refill_amount" integer,
	"refill_interval" integer,
	"remaining" integer,
	"request_count" integer DEFAULT 0,
	"start" text,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"current" numeric(19,4) NOT NULL,
	"available" numeric(19,4),
	"credit_limit" numeric(19,4),
	"buying_power" numeric(19,4),
	"currency" text,
	"user_override_credit_limit" numeric(19,4),
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"exclude_from_insights" boolean DEFAULT false NOT NULL,
	"group_id" uuid NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"icon_key" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"system_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_group" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"system_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_mapping_cache" (
	"action" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"new_name" text,
	"source_label" text,
	"target_category_id" uuid,
	"user_id" text,
	CONSTRAINT "category_mapping_cache_pkey" PRIMARY KEY("user_id","source_label")
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"chat_id" varchar PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "credit_liability" (
	"id" uuid DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL CONSTRAINT "credit_liability_v2_account_id_key" UNIQUE,
	"user_id" text NOT NULL,
	"aprs" jsonb,
	"is_overdue" boolean DEFAULT false NOT NULL,
	"last_payment_amount" numeric(19,4),
	"last_payment_date" date,
	"last_statement_balance" numeric(19,4),
	"last_statement_issue_date" date,
	"minimum_payment_amount" numeric(19,4),
	"next_payment_due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_liability_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "csv_column_role_cache" (
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"header_name" text,
	"meta" jsonb,
	"role" text NOT NULL,
	"user_id" text,
	CONSTRAINT "csv_column_role_cache_pkey" PRIMARY KEY("user_id","header_name")
);
--> statement-breakpoint
CREATE TABLE "csv_mapping_cache" (
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"header_hash" text,
	"mapping" jsonb NOT NULL,
	"user_id" text,
	CONSTRAINT "csv_mapping_cache_pkey" PRIMARY KEY("user_id","header_hash")
);
--> statement-breakpoint
CREATE TABLE "event_articles" (
	"title" text NOT NULL,
	"news_url" text NOT NULL,
	"image_url" text,
	"text" text,
	"sentiment" varchar,
	"type" varchar,
	"source_name" varchar,
	"date" timestamp,
	"tickers" jsonb,
	"topics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"financial_event_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"user_id" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"contact_email" text,
	"contact_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "financial_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "account_source" NOT NULL,
	"external_id" text,
	"user_id" text NOT NULL,
	"plaid_connection_id" uuid,
	"snaptrade_authorization_id" uuid,
	"name" text NOT NULL,
	"official_name" text,
	"mask" text,
	"account_number" text,
	"type" text NOT NULL,
	"subtype" text,
	"status" text,
	"persistent_account_id" text,
	"institution_name" text,
	"portfolio_group" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logo_domain" text,
	"custom_name" text,
	"csv_coverage_through" date,
	CONSTRAINT "financial_account_connection_arc" CHECK ((num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1))
);
--> statement-breakpoint
CREATE TABLE "financial_events" (
	"event_id" varchar NOT NULL CONSTRAINT "financial_events_event_id_unique" UNIQUE,
	"event_name" text NOT NULL,
	"event_text" text,
	"news_items" integer DEFAULT 0 NOT NULL,
	"date" timestamp,
	"tickers" jsonb,
	"summary" text,
	"key_points" jsonb,
	"sentiment" varchar,
	"scraped_articles_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"topics" jsonb DEFAULT '["other"]',
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"user_id" text NOT NULL,
	"name" varchar NOT NULL,
	"target_amount" numeric(15,2) NOT NULL,
	"icon" varchar DEFAULT 'target' NOT NULL,
	"target_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "fundamentals" (
	"analyst_buy" integer,
	"analyst_consensus" text,
	"analyst_hold" integer,
	"analyst_sell" integer,
	"analyst_strong_buy" integer,
	"analyst_strong_sell" integer,
	"analyst_synced_at" timestamp with time zone,
	"capex" bigint,
	"cash" bigint,
	"ceo" text,
	"company_name" text,
	"description" text,
	"employees" integer,
	"eps" numeric(10,4),
	"financials_synced_at" timestamp with time zone,
	"fiscal_year_end" date,
	"gross_profit" bigint,
	"industry" text,
	"ipo_date" date,
	"long_term_debt" bigint,
	"net_income" bigint,
	"operating_cash_flow" bigint,
	"operating_income" bigint,
	"profile_synced_at" timestamp with time zone,
	"revenue" bigint,
	"sector" text,
	"shares_outstanding_diluted" bigint,
	"sic_code" text,
	"stockholders_equity" bigint,
	"symbol" text PRIMARY KEY,
	"total_assets" bigint,
	"total_liabilities" bigint,
	"website" text,
	"next_earnings_date" date
);
--> statement-breakpoint
CREATE TABLE "holding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "security_source" NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"security_id" uuid NOT NULL,
	"quantity" numeric(28,10) NOT NULL,
	"cost_basis" numeric(19,4),
	"average_price" numeric(28,10),
	"institution_price" numeric(28,10),
	"institution_value" numeric(19,4),
	"institution_price_as_of" date,
	"institution_price_datetime" timestamp with time zone,
	"open_pnl" numeric(19,4),
	"currency" text,
	"vested_quantity" numeric(28,10),
	"vested_value" numeric(19,4),
	"is_quotable" boolean,
	"is_tradable" boolean,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_job" (
	"account_resolution" jsonb,
	"account_suggestions" jsonb,
	"cancelled_at" timestamp with time zone,
	"category_resolution" jsonb,
	"category_suggestions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"file_hash" text,
	"file_key" text,
	"headers" text[] DEFAULT '{}'::text[] NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"original_filename" text,
	"progress" jsonb,
	"sample_rows" jsonb,
	"schema_confirmed_at" timestamp with time zone,
	"schema_mapping" jsonb,
	"source" "import_source" NOT NULL,
	"status" "import_job_status" DEFAULT 'uploaded'::"import_job_status" NOT NULL,
	"summary" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"workflow_run_id" text
);
--> statement-breakpoint
CREATE TABLE "import_staged_transaction" (
	"amount" numeric(19,4) NOT NULL,
	"date" date NOT NULL,
	"dedupe_match_id" uuid,
	"external_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"import_job_id" uuid NOT NULL,
	"is_split" boolean DEFAULT false NOT NULL,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"merchant" text NOT NULL,
	"notes" text,
	"original_description" text,
	"parse_error" text,
	"raw_blob" jsonb,
	"source_account_name" text NOT NULL,
	"source_category_name" text,
	"tags" text[]
);
--> statement-breakpoint
CREATE TABLE "institution" (
	"plaid_institution_id" text NOT NULL CONSTRAINT "institution_plaid_institution_id_unique" UNIQUE,
	"name" text NOT NULL,
	"url" text,
	"primary_color" text,
	"logo" text,
	"routing_numbers" jsonb,
	"oauth" boolean DEFAULT false NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid DEFAULT gen_random_uuid(),
	CONSTRAINT "plaid_institutions_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "investment_activity" (
	"id" uuid DEFAULT gen_random_uuid(),
	"source" "activity_source" NOT NULL,
	"external_id" text,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"security_id" uuid,
	"type" text NOT NULL,
	"subtype" text,
	"amount" numeric(19,4) NOT NULL,
	"quantity" numeric(28,10),
	"price" numeric(28,10),
	"fees" numeric(19,4),
	"date" date NOT NULL,
	"settlement_date" date,
	"name" text NOT NULL,
	"currency" text,
	"cancel_transaction_id" text,
	"external_reference_id" text,
	"option_symbol" text,
	"option_type" text,
	"fx_rate" numeric(19,8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_activity_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone,
	"id" text PRIMARY KEY,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kalshi_users" (
	"user_id" text PRIMARY KEY,
	"api_key_id" varchar NOT NULL,
	"private_key_pem" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"last_verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"message_id" varchar NOT NULL,
	"vote" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_votes_user_message_unique" UNIQUE("user_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"message_id" varchar PRIMARY KEY,
	"chat_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"role" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_subscription" (
	"id" text,
	"user_id" text NOT NULL,
	"original_transaction_id" text NOT NULL CONSTRAINT "mobile_subscription_original_transaction_id_unique" UNIQUE,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp,
	"environment" text NOT NULL,
	"latest_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_store_subscription_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "mortgage_liability" (
	"id" uuid DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL CONSTRAINT "mortgage_liability_v2_account_id_key" UNIQUE,
	"user_id" text NOT NULL,
	"account_number" text,
	"current_late_fee" numeric(19,4),
	"escrow_balance" numeric(19,4),
	"has_pmi" boolean,
	"has_prepayment_penalty" boolean,
	"interest_rate" jsonb,
	"last_payment_amount" numeric(19,4),
	"last_payment_date" date,
	"loan_term" text,
	"loan_type_description" text,
	"maturity_date" date,
	"next_monthly_payment" numeric(19,4),
	"next_payment_due_date" date,
	"origination_date" date,
	"origination_principal_amount" numeric(19,4),
	"past_due_amount" numeric(19,4),
	"property_address" jsonb,
	"ytd_interest_paid" numeric(19,4),
	"ytd_principal_paid" numeric(19,4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mortgage_liability_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "oauth_access_token" (
	"client_id" text NOT NULL,
	"created_at" timestamp(6) with time zone NOT NULL,
	"expires_at" timestamp(6) with time zone NOT NULL,
	"id" text PRIMARY KEY,
	"reference_id" text,
	"refresh_id" text,
	"scopes" text[] NOT NULL,
	"session_id" text,
	"token" varchar(255) NOT NULL CONSTRAINT "oauth_access_token_token_key" UNIQUE,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"client_id" varchar(255) NOT NULL CONSTRAINT "oauth_client_client_id_key" UNIQUE,
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
	"user_id" text,
	"jwks" text,
	"jwks_uri" text
);
--> statement-breakpoint
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
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"external_id" text NOT NULL CONSTRAINT "orders_external_id_key" UNIQUE,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"security_id" uuid,
	"action" text,
	"order_type" text,
	"time_in_force" text,
	"status" text,
	"total_quantity" numeric(28,10),
	"filled_quantity" numeric(28,10),
	"open_quantity" numeric(28,10),
	"canceled_quantity" numeric(28,10),
	"limit_price" numeric(28,10),
	"stop_price" numeric(28,10),
	"execution_price" numeric(28,10),
	"strike_price" numeric(28,10),
	"option_type" text,
	"option_symbol" jsonb,
	"is_mini_option" boolean,
	"expiry_date" timestamp with time zone,
	"expiration_date" timestamp with time zone,
	"time_placed" timestamp with time zone,
	"time_updated" timestamp with time zone,
	"time_executed" timestamp with time zone,
	"currency" text,
	"child_brokerage_order_ids" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"part_id" varchar PRIMARY KEY,
	"message_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"text_text" text,
	"reasoning_text" text,
	"file_media_type" varchar,
	"file_filename" varchar,
	"file_url" varchar,
	"source_url_source_id" varchar,
	"source_url_url" varchar,
	"source_url_title" varchar,
	"source_document_source_id" varchar,
	"source_document_media_type" varchar,
	"source_document_title" varchar,
	"source_document_filename" varchar,
	"tool_call_id" varchar,
	"tool_state" varchar,
	"tool_error_text" varchar,
	"tool_input" jsonb,
	"tool_output" jsonb,
	"provider_metadata" jsonb,
	"data" jsonb,
	CONSTRAINT "file_fields_required_if_type_is_file" CHECK (
CASE
    WHEN ((type)::text = 'file'::text) THEN ((file_media_type IS NOT NULL) AND (file_url IS NOT NULL))
    ELSE true
END),
	CONSTRAINT "reasoning_text_required_if_type_is_reasoning" CHECK (
CASE
    WHEN ((type)::text = 'reasoning'::text) THEN (reasoning_text IS NOT NULL)
    ELSE true
END),
	CONSTRAINT "source_document_fields_required_if_type_is_source_document" CHECK (
CASE
    WHEN ((type)::text = 'source_document'::text) THEN ((source_document_source_id IS NOT NULL) AND (source_document_media_type IS NOT NULL) AND (source_document_title IS NOT NULL))
    ELSE true
END),
	CONSTRAINT "source_url_fields_required_if_type_is_source_url" CHECK (
CASE
    WHEN ((type)::text = 'source_url'::text) THEN ((source_url_source_id IS NOT NULL) AND (source_url_url IS NOT NULL))
    ELSE true
END),
	CONSTRAINT "text_text_required_if_type_is_text" CHECK (
CASE
    WHEN ((type)::text = 'text'::text) THEN (text_text IS NOT NULL)
    ELSE true
END)
);
--> statement-breakpoint
CREATE TABLE "plaid_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"plaid_item_id" text NOT NULL CONSTRAINT "plaid_connection_plaid_item_id_key" UNIQUE,
	"plaid_access_token" text NOT NULL,
	"transactions_cursor" text,
	"recurring_updated_datetime" timestamp with time zone,
	"webhook_url" text,
	"available_products" jsonb,
	"billed_products" jsonb,
	"error" jsonb,
	"institution_id" text,
	"institution_name" text,
	"institution_logo" text,
	"new_accounts_available" boolean DEFAULT false NOT NULL,
	"pending_disconnect_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring" (
	"id" uuid DEFAULT gen_random_uuid(),
	"source" "transaction_source" NOT NULL,
	"external_id" text,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL,
	"merchant_name" text,
	"frequency" text NOT NULL,
	"status" text NOT NULL,
	"stream_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"average_amount" numeric(19,4) NOT NULL,
	"last_amount" numeric(19,4) NOT NULL,
	"first_date" date NOT NULL,
	"last_date" date NOT NULL,
	"predicted_next_date" date,
	"transaction_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category_id" uuid,
	CONSTRAINT "recurring_stream_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "rss_articles" (
	"metadata" jsonb,
	"title" text NOT NULL,
	"description" text,
	"link" text NOT NULL CONSTRAINT "rss_articles_link_unique" UNIQUE,
	"published_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"feed_ids" jsonb NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"company" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL CONSTRAINT "rss_feeds_url_unique" UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched" timestamp,
	"fetch_interval_minutes" varchar DEFAULT '5',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE TABLE "security" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "security_source" NOT NULL,
	"external_id" text,
	"name" text,
	"ticker_symbol" text,
	"cusip" text,
	"isin" text,
	"sedol" text,
	"figi_code" text,
	"type" text,
	"subtype" text,
	"currency" text,
	"is_cash_equivalent" boolean,
	"close_price" numeric(28,10),
	"close_price_as_of" date,
	"industry" text,
	"sector" text,
	"institution_id" text,
	"institution_security_id" text,
	"proxy_security_id" text,
	"market_identifier_code" text,
	"exchange_code" text,
	"exchange_name" text,
	"fixed_income" jsonb,
	"option_contract" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL CONSTRAINT "session_token_unique" UNIQUE,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "account_source",
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"current" numeric(19,4) NOT NULL,
	"available" numeric(19,4),
	"credit_limit" numeric(19,4),
	"buying_power" numeric(19,4),
	"positions_value" numeric(19,4),
	"positions_count" integer,
	"currency" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snaptrade_authorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"authorization_id" text NOT NULL CONSTRAINT "snaptrade_authorization_authorization_id_key" UNIQUE,
	"brokerage" text NOT NULL,
	"brokerage_slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"is_eligible_for_payout" boolean DEFAULT false NOT NULL,
	"disabled_at" timestamp with time zone,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snaptrade_user" (
	"user_id" text PRIMARY KEY,
	"snaptrade_user_id" text NOT NULL CONSTRAINT "snaptrade_user_snaptrade_user_id_key" UNIQUE,
	"snaptrade_user_secret" text NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_loan_liability" (
	"id" uuid DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL CONSTRAINT "student_loan_liability_v2_account_id_key" UNIQUE,
	"user_id" text NOT NULL,
	"account_number" text,
	"disbursement_dates" jsonb,
	"expected_payoff_date" date,
	"guarantor" text,
	"interest_rate_percentage" numeric(9,6),
	"is_overdue" boolean,
	"last_payment_amount" numeric(19,4),
	"last_payment_date" date,
	"last_statement_balance" numeric(19,4),
	"last_statement_issue_date" date,
	"loan_name" text,
	"loan_status" jsonb,
	"minimum_payment_amount" numeric(19,4),
	"next_payment_due_date" date,
	"origination_date" date,
	"origination_principal_amount" numeric(19,4),
	"outstanding_interest_amount" numeric(19,4),
	"payment_reference_number" text,
	"pslf_status" jsonb,
	"repayment_plan" jsonb,
	"sequence_number" text,
	"servicer_address" jsonb,
	"ytd_interest_paid" numeric(19,4),
	"ytd_principal_paid" numeric(19,4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_loan_liability_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY,
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
	"billing_interval" text
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"archived_at" timestamp with time zone,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "tag_color_check" CHECK ((color = ANY (ARRAY['red'::text, 'orange'::text, 'amber'::text, 'yellow'::text, 'lime'::text, 'green'::text, 'teal'::text, 'cyan'::text, 'blue'::text, 'indigo'::text, 'violet'::text, 'purple'::text, 'pink'::text, 'rose'::text, 'slate'::text, 'stone'::text]))),
	CONSTRAINT "tag_name_length_check" CHECK ((length(name) <= 50))
);
--> statement-breakpoint
CREATE TABLE "tickers" (
	"cik" text,
	"country" text,
	"currency" text,
	"exchange" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"symbol" text PRIMARY KEY,
	"synced_at" timestamp with time zone NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" uuid DEFAULT gen_random_uuid(),
	"source" "transaction_source" NOT NULL,
	"external_id" text,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"date" date NOT NULL,
	"authorized_date" date,
	"name" text NOT NULL,
	"merchant_name" text,
	"merchant_entity_id" text,
	"logo_url" text,
	"website" text,
	"counterparties" jsonb,
	"payment_channel" text,
	"pending" boolean DEFAULT false NOT NULL,
	"pending_transaction_id" text,
	"transaction_code" text,
	"account_owner" text,
	"check_number" text,
	"currency" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"address" text,
	"city" text,
	"country" text,
	"lat" double precision,
	"lon" double precision,
	"postal_code" text,
	"region" text,
	"store_number" text,
	"locked_fields" jsonb DEFAULT '[]' NOT NULL,
	"category_id" uuid,
	"excluded" boolean DEFAULT false NOT NULL,
	"import_hash" text,
	"import_job_id" uuid,
	CONSTRAINT "transaction_v2_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "transaction_edit" (
	"actor" "transaction_edit_actor" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"field" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"new_value" jsonb,
	"old_value" jsonb,
	"transaction_id" uuid NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tag" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tag_id" uuid,
	"transaction_id" uuid,
	CONSTRAINT "transaction_tag_pkey" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text CONSTRAINT "user_email_unique" UNIQUE,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stripe_customer_id" text CONSTRAINT "user_stripe_customer_id_unique" UNIQUE,
	"last_seen_at" timestamp,
	"is_anonymous" boolean,
	"onboarded_at" timestamp,
	"onboarding_step" text
);
--> statement-breakpoint
CREATE TABLE "user_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "apikey_config_id_idx" ON "apikey" ("config_id");--> statement-breakpoint
CREATE INDEX "apikey_key_idx" ON "apikey" ("key");--> statement-breakpoint
CREATE INDEX "apikey_reference_id_idx" ON "apikey" ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "balance_account_id_unique" ON "balance" ("account_id");--> statement-breakpoint
CREATE INDEX "balance_account_updated_idx" ON "balance" ("account_id","updated_at");--> statement-breakpoint
CREATE INDEX "balance_user_id_idx" ON "balance" ("user_id");--> statement-breakpoint
CREATE INDEX "category_group_id_idx" ON "category" ("group_id");--> statement-breakpoint
CREATE INDEX "category_user_active_idx" ON "category" ("user_id") WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "category_user_id_idx" ON "category" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_user_system_key_idx" ON "category" ("user_id","system_key") WHERE (system_key IS NOT NULL);--> statement-breakpoint
CREATE INDEX "category_group_user_active_idx" ON "category_group" ("user_id") WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "category_group_user_id_idx" ON "category_group" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_group_user_system_key_idx" ON "category_group" ("user_id","system_key") WHERE (system_key IS NOT NULL);--> statement-breakpoint
CREATE INDEX "chats_chat_id_updated_at_idx" ON "chats" ("chat_id","updated_at");--> statement-breakpoint
CREATE INDEX "chats_updated_at_idx" ON "chats" ("updated_at");--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" ("user_id");--> statement-breakpoint
CREATE INDEX "credit_liability_user_id_idx" ON "credit_liability" ("user_id");--> statement-breakpoint
CREATE INDEX "event_articles_date_idx" ON "event_articles" ("date");--> statement-breakpoint
CREATE INDEX "event_articles_financial_event_id_idx" ON "event_articles" ("financial_event_id");--> statement-breakpoint
CREATE INDEX "event_articles_news_url_idx" ON "event_articles" ("news_url");--> statement-breakpoint
CREATE INDEX "event_articles_source_name_idx" ON "event_articles" ("source_name");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "feedback" ("type");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_account_persistent_id_idx" ON "financial_account" ("persistent_account_id");--> statement-breakpoint
CREATE INDEX "financial_account_plaid_connection_id_idx" ON "financial_account" ("plaid_connection_id");--> statement-breakpoint
CREATE INDEX "financial_account_snaptrade_auth_id_idx" ON "financial_account" ("snaptrade_authorization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_account_source_external_id_idx" ON "financial_account" ("source","external_id") WHERE (external_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "financial_account_user_id_idx" ON "financial_account" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_account_user_type_idx" ON "financial_account" ("user_id","type");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_id_idx" ON "financial_events" ("created_at","id");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_idx" ON "financial_events" ("created_at");--> statement-breakpoint
CREATE INDEX "financial_events_date_id_idx" ON "financial_events" ("date","id");--> statement-breakpoint
CREATE INDEX "financial_events_date_idx" ON "financial_events" ("date");--> statement-breakpoint
CREATE INDEX "financial_events_event_id_idx" ON "financial_events" ("event_id");--> statement-breakpoint
CREATE INDEX "financial_events_sentiment_idx" ON "financial_events" ("sentiment");--> statement-breakpoint
CREATE INDEX "financial_events_tickers_idx" ON "financial_events" USING gin ("tickers");--> statement-breakpoint
CREATE INDEX "financial_goals_created_at_idx" ON "financial_goals" ("created_at");--> statement-breakpoint
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals" ("user_id");--> statement-breakpoint
CREATE INDEX "holding_account_id_idx" ON "holding" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holding_account_security_idx" ON "holding" ("account_id","security_id");--> statement-breakpoint
CREATE INDEX "holding_security_id_idx" ON "holding" ("security_id");--> statement-breakpoint
CREATE INDEX "holding_user_id_idx" ON "holding" ("user_id");--> statement-breakpoint
CREATE INDEX "import_job_user_file_hash_idx" ON "import_job" ("user_id","file_hash");--> statement-breakpoint
CREATE INDEX "import_job_user_id_idx" ON "import_job" ("user_id");--> statement-breakpoint
CREATE INDEX "import_job_user_status_idx" ON "import_job" ("user_id","status");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_dedupe_match_idx" ON "import_staged_transaction" ("dedupe_match_id");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_job_id_idx" ON "import_staged_transaction" ("import_job_id");--> statement-breakpoint
CREATE INDEX "institution_name_idx" ON "institution" ("name");--> statement-breakpoint
CREATE INDEX "institution_provider_id_idx" ON "institution" ("plaid_institution_id");--> statement-breakpoint
CREATE INDEX "investment_activity_account_date_idx" ON "investment_activity" ("account_id","date");--> statement-breakpoint
CREATE INDEX "investment_activity_account_idx" ON "investment_activity" ("account_id");--> statement-breakpoint
CREATE INDEX "investment_activity_date_idx" ON "investment_activity" ("date");--> statement-breakpoint
CREATE INDEX "investment_activity_security_idx" ON "investment_activity" ("security_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_activity_source_external_id_idx" ON "investment_activity" ("source","external_id") WHERE (external_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "investment_activity_type_idx" ON "investment_activity" ("type");--> statement-breakpoint
CREATE INDEX "investment_activity_user_idx" ON "investment_activity" ("user_id");--> statement-breakpoint
CREATE INDEX "kalshi_users_api_key_id_idx" ON "kalshi_users" ("api_key_id");--> statement-breakpoint
CREATE INDEX "message_votes_message_id_idx" ON "message_votes" ("message_id");--> statement-breakpoint
CREATE INDEX "message_votes_user_id_idx" ON "message_votes" ("user_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" ("chat_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_original_transaction_id_idx" ON "mobile_subscription" ("original_transaction_id");--> statement-breakpoint
CREATE INDEX "mobile_subscription_status_idx" ON "mobile_subscription" ("status");--> statement-breakpoint
CREATE INDEX "mobile_subscription_user_id_idx" ON "mobile_subscription" ("user_id");--> statement-breakpoint
CREATE INDEX "mortgage_liability_user_id_idx" ON "mortgage_liability" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_client_id_idx" ON "oauth_access_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_reference_id_idx" ON "oauth_access_token" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_refresh_id_idx" ON "oauth_access_token" ("refresh_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_session_id_idx" ON "oauth_access_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_access_token_user_id_idx" ON "oauth_access_token" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_client_client_id_idx" ON "oauth_client" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_client_reference_id_idx" ON "oauth_client" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_client_user_id_idx" ON "oauth_client" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_client_user_idx" ON "oauth_consent" ("client_id","user_id");--> statement-breakpoint
CREATE INDEX "oauth_consent_reference_id_idx" ON "oauth_consent" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_client_id_idx" ON "oauth_refresh_token" ("client_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_reference_id_idx" ON "oauth_refresh_token" ("reference_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_session_id_idx" ON "oauth_refresh_token" ("session_id");--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_user_id_idx" ON "oauth_refresh_token" ("user_id");--> statement-breakpoint
CREATE INDEX "orders_account_id_idx" ON "orders" ("account_id");--> statement-breakpoint
CREATE INDEX "orders_security_id_idx" ON "orders" ("security_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" ("status");--> statement-breakpoint
CREATE INDEX "orders_time_placed_idx" ON "orders" ("time_placed");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" ("user_id");--> statement-breakpoint
CREATE INDEX "parts_message_id_idx" ON "parts" ("message_id");--> statement-breakpoint
CREATE INDEX "parts_message_id_order_idx" ON "parts" ("message_id","order");--> statement-breakpoint
CREATE INDEX "plaid_connection_institution_id_idx" ON "plaid_connection" ("institution_id");--> statement-breakpoint
CREATE INDEX "plaid_connection_user_id_idx" ON "plaid_connection" ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_connection_user_institution_idx" ON "plaid_connection" ("user_id","institution_id");--> statement-breakpoint
CREATE INDEX "recurring_account_date_type_idx" ON "recurring" ("account_id","last_date","stream_type");--> statement-breakpoint
CREATE INDEX "recurring_account_id_idx" ON "recurring" ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_category_id_idx" ON "recurring" ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_source_external_id_idx" ON "recurring" ("source","external_id") WHERE (external_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "recurring_user_id_idx" ON "recurring" ("user_id");--> statement-breakpoint
CREATE INDEX "rss_articles_created_at_idx" ON "rss_articles" ("created_at");--> statement-breakpoint
CREATE INDEX "rss_articles_link_where_idx" ON "rss_articles" ("link");--> statement-breakpoint
CREATE INDEX "rss_articles_published_date_idx" ON "rss_articles" ("published_date");--> statement-breakpoint
CREATE INDEX "rss_feeds_category_idx" ON "rss_feeds" ("category");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_category_idx" ON "rss_feeds" ("company","category");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_idx" ON "rss_feeds" ("company");--> statement-breakpoint
CREATE INDEX "rss_feeds_is_active_idx" ON "rss_feeds" ("is_active");--> statement-breakpoint
CREATE INDEX "rss_feeds_last_fetched_idx" ON "rss_feeds" ("last_fetched");--> statement-breakpoint
CREATE INDEX "rss_feeds_url_idx" ON "rss_feeds" ("url");--> statement-breakpoint
CREATE INDEX "security_cusip_idx" ON "security" ("cusip");--> statement-breakpoint
CREATE INDEX "security_figi_idx" ON "security" ("figi_code");--> statement-breakpoint
CREATE INDEX "security_sector_idx" ON "security" ("sector");--> statement-breakpoint
CREATE UNIQUE INDEX "security_source_external_id_idx" ON "security" ("source","external_id") WHERE (external_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "security_ticker_idx" ON "security" ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "security_type_idx" ON "security" ("type");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshot_account_date_idx" ON "snapshot" ("account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "snapshot_account_id_idx" ON "snapshot" ("account_id");--> statement-breakpoint
CREATE INDEX "snapshot_date_idx" ON "snapshot" ("snapshot_date");--> statement-breakpoint
CREATE INDEX "snapshot_user_id_idx" ON "snapshot" ("user_id");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_brokerage_slug_idx" ON "snaptrade_authorization" ("brokerage_slug");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_is_disabled_idx" ON "snaptrade_authorization" ("is_disabled");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_user_id_idx" ON "snaptrade_authorization" ("user_id");--> statement-breakpoint
CREATE INDEX "snaptrade_user_snaptrade_user_id_idx" ON "snaptrade_user" ("snaptrade_user_id");--> statement-breakpoint
CREATE INDEX "student_loan_liability_user_id_idx" ON "student_loan_liability" ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscription" ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_customer_id_idx" ON "subscription" ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscription" ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "tag_user_id_active_idx" ON "tag" ("user_id") WHERE (archived_at IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "tag_user_id_lower_name_idx" ON "tag" ("user_id",lower(name));--> statement-breakpoint
CREATE INDEX "tickers_cik_idx" ON "tickers" ("cik");--> statement-breakpoint
CREATE INDEX "tickers_exchange_idx" ON "tickers" ("exchange");--> statement-breakpoint
CREATE INDEX "tickers_is_active_idx" ON "tickers" ("is_active");--> statement-breakpoint
CREATE INDEX "transaction_account_date_idx" ON "transaction" ("account_id","date");--> statement-breakpoint
CREATE INDEX "transaction_account_id_idx" ON "transaction" ("account_id");--> statement-breakpoint
CREATE INDEX "transaction_category_id_idx" ON "transaction" ("category_id");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "transaction" ("date");--> statement-breakpoint
CREATE INDEX "transaction_date_pending_idx" ON "transaction" ("date","pending");--> statement-breakpoint
CREATE INDEX "transaction_import_job_id_idx" ON "transaction" ("import_job_id");--> statement-breakpoint
CREATE INDEX "transaction_pending_idx" ON "transaction" ("pending");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_source_external_id_idx" ON "transaction" ("source","external_id") WHERE (external_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "transaction_user_id_idx" ON "transaction" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_user_import_hash_idx" ON "transaction" ("user_id","import_hash") WHERE (import_hash IS NOT NULL);--> statement-breakpoint
CREATE INDEX "transaction_edit_created_at_idx" ON "transaction_edit" ("created_at");--> statement-breakpoint
CREATE INDEX "transaction_edit_transaction_id_idx" ON "transaction_edit" ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_tag_tag_id_idx" ON "transaction_tag" ("tag_id");--> statement-breakpoint
CREATE INDEX "user_alerts_active_idx" ON "user_alerts" ("user_id","resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_alerts_dedup_idx" ON "user_alerts" ("source","source_id","type") WHERE (resolved_at IS NULL);--> statement-breakpoint
CREATE INDEX "user_alerts_source_idx" ON "user_alerts" ("source","source_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mobile_subscription" ADD CONSTRAINT "mobile_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_financial_event_id_financial_events_id_fk" FOREIGN KEY ("financial_event_id") REFERENCES "financial_events"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "kalshi_users" ADD CONSTRAINT "kalshi_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats"("chat_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "messages"("message_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "oauth_refresh_token"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "oauth_client"("client_id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "fundamentals" ADD CONSTRAINT "fundamentals_symbol_tickers_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "tickers"("symbol") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "balance" ADD CONSTRAINT "balance_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "balance" ADD CONSTRAINT "balance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_liability" ADD CONSTRAINT "credit_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_liability" ADD CONSTRAINT "credit_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_gjEcqbMwVh7T_fkey" FOREIGN KEY ("snaptrade_authorization_id") REFERENCES "snaptrade_authorization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_plaid_connection_id_plaid_connection_id_fkey" FOREIGN KEY ("plaid_connection_id") REFERENCES "plaid_connection"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_v2_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "investment_activity" ADD CONSTRAINT "investment_activity_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mortgage_liability" ADD CONSTRAINT "mortgage_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mortgage_liability" ADD CONSTRAINT "mortgage_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plaid_connection" ADD CONSTRAINT "plaid_connection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_category_id_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_stream_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring" ADD CONSTRAINT "recurring_stream_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snaptrade_authorization" ADD CONSTRAINT "snaptrade_authorization_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snaptrade_user" ADD CONSTRAINT "snaptrade_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_loan_liability" ADD CONSTRAINT "student_loan_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_loan_liability" ADD CONSTRAINT "student_loan_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_edit" ADD CONSTRAINT "transaction_edit_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_edit" ADD CONSTRAINT "transaction_edit_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_tag_id_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_group_id_category_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "category_group"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category_group" ADD CONSTRAINT "category_group_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account_mapping_cache" ADD CONSTRAINT "account_mapping_cache_QIANh4m9DjQ9_fkey" FOREIGN KEY ("cobalt_account_id") REFERENCES "financial_account"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "account_mapping_cache" ADD CONSTRAINT "account_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category_mapping_cache" ADD CONSTRAINT "category_mapping_cache_target_category_id_category_id_fkey" FOREIGN KEY ("target_category_id") REFERENCES "category"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "category_mapping_cache" ADD CONSTRAINT "category_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "csv_column_role_cache" ADD CONSTRAINT "csv_column_role_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "csv_mapping_cache" ADD CONSTRAINT "csv_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_dedupe_match_id_transaction_id_fkey" FOREIGN KEY ("dedupe_match_id") REFERENCES "transaction"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_reference_id_user_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."bank_account" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM archive.bank_connection
  WHERE ((bank_connection.plaid_item_id = bank_account.plaid_item_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."bank_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."bank_balance" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = bank_balance.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."bank_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."bank_balance_snapshot" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = bank_balance_snapshot.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."bank_balance_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."bank_connection" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."bank_connection" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_account" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_account" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_account_detail" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_account_detail" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_activity" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_authorization" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_authorization" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_balance" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_balance" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_order" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_order" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_position" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."brokerage_user" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."brokerage_user" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."credit_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = credit_liability.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."credit_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."investment_activity" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = investment_activity.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."investment_activity" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."investment_position" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = investment_position.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."investment_position" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "archive"."investment_security" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."investment_security" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."mortgage_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = mortgage_liability.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."mortgage_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."portfolio_snapshot" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."portfolio_snapshot" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."recurring_stream" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = recurring_stream.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."recurring_stream" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."student_loan_liability" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = student_loan_liability.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."student_loan_liability" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));--> statement-breakpoint
CREATE POLICY "agent_select_own" ON "archive"."transaction" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (((current_setting('request.jwt.claims'::text, true) IS NULL) OR (EXISTS ( SELECT 1
   FROM (archive.bank_account
     JOIN archive.bank_connection ON ((bank_connection.plaid_item_id = bank_account.plaid_item_id)))
  WHERE ((bank_account.plaid_account_id = transaction.plaid_account_id) AND (bank_connection.user_id = ( SELECT ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text))))))));--> statement-breakpoint
CREATE POLICY "app_full_access" ON "archive"."transaction" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING ((CURRENT_USER <> 'agent_readonly'::name)) WITH CHECK ((CURRENT_USER <> 'agent_readonly'::name));
*/