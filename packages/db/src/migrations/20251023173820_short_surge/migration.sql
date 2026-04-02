CREATE TYPE "public"."feedback_type" AS ENUM('general', 'bug', 'feature');--> statement-breakpoint
CREATE TABLE "chats" (
	"chat_id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"message_id" varchar PRIMARY KEY NOT NULL,
	"chat_id" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"role" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "parts" (
	"part_id" varchar PRIMARY KEY NOT NULL,
	"message_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"text_text" text,
	"reasoning_text" text,
	"file_mediaType" varchar,
	"file_filename" varchar,
	"file_url" varchar,
	"source_url_sourceId" varchar,
	"source_url_url" varchar,
	"source_url_title" varchar,
	"source_document_sourceId" varchar,
	"source_document_mediaType" varchar,
	"source_document_title" varchar,
	"source_document_filename" varchar,
	"tool_toolCallId" varchar,
	"tool_state" varchar,
	"tool_errorText" varchar,
	"tool_input" jsonb,
	"tool_output" jsonb,
	"providerMetadata" jsonb,
	CONSTRAINT "text_text_required_if_type_is_text" CHECK (CASE WHEN "parts"."type" = 'text' THEN "parts"."text_text" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "reasoning_text_required_if_type_is_reasoning" CHECK (CASE WHEN "parts"."type" = 'reasoning' THEN "parts"."reasoning_text" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "file_fields_required_if_type_is_file" CHECK (CASE WHEN "parts"."type" = 'file' THEN "parts"."file_mediaType" IS NOT NULL AND "parts"."file_url" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "source_url_fields_required_if_type_is_source_url" CHECK (CASE WHEN "parts"."type" = 'source_url' THEN "parts"."source_url_sourceId" IS NOT NULL AND "parts"."source_url_url" IS NOT NULL ELSE TRUE END),
	CONSTRAINT "source_document_fields_required_if_type_is_source_document" CHECK (CASE WHEN "parts"."type" = 'source_document' THEN "parts"."source_document_sourceId" IS NOT NULL AND "parts"."source_document_mediaType" IS NOT NULL AND "parts"."source_document_title" IS NOT NULL ELSE TRUE END)
);
--> statement-breakpoint
ALTER TABLE "parts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_accounts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_item_id" text NOT NULL,
	"plaid_account_id" text NOT NULL,
	"name" text NOT NULL,
	"mask" text,
	"official_name" text,
	"type" varchar NOT NULL,
	"subtype" varchar,
	"verification_status" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_accounts_plaid_account_id_unique" UNIQUE("plaid_account_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_balances" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_account_id" text NOT NULL,
	"available" real,
	"current" real NOT NULL,
	"limit" real,
	"iso_currency_code" varchar,
	"unofficial_currency_code" varchar,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plaid_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_credit_liabilities" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_account_id" text NOT NULL,
	"last_statement_balance" real,
	"minimum_payment_amount" real,
	"next_payment_due_date" text,
	"last_payment_amount" real,
	"last_payment_date" text,
	"is_overdue" boolean DEFAULT false NOT NULL,
	"aprs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_institutions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_institution_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"primary_color" text,
	"logo" text,
	"routing_numbers" jsonb,
	"oauth" boolean DEFAULT false NOT NULL,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_institutions_plaid_institution_id_unique" UNIQUE("plaid_institution_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_institutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plaid_item_id" text NOT NULL,
	"plaid_access_token" text NOT NULL,
	"institution_id" text,
	"institution_name" text,
	"institution_logo" text,
	"available_products" jsonb,
	"billed_products" jsonb,
	"webhook_url" text,
	"transactions_cursor" text,
	"recurring_updated_datetime" text,
	"error" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_items_plaid_item_id_unique" UNIQUE("plaid_item_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_recurring_streams" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_account_id" text NOT NULL,
	"stream_id" text NOT NULL,
	"stream_type" varchar NOT NULL,
	"description" text NOT NULL,
	"merchant_name" text,
	"first_date" text NOT NULL,
	"last_date" text NOT NULL,
	"predicted_next_date" text,
	"last_user_modified_datetime" text,
	"frequency" varchar NOT NULL,
	"status" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"transaction_ids" jsonb NOT NULL,
	"average_amount" real NOT NULL,
	"last_amount" real NOT NULL,
	"personal_finance_category" jsonb,
	"category" jsonb,
	"category_id" text,
	"is_user_modified" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_recurring_streams_stream_id_unique" UNIQUE("stream_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_transactions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"plaid_account_id" text NOT NULL,
	"plaid_transaction_id" text NOT NULL,
	"account_owner" text,
	"amount" real NOT NULL,
	"authorized_date" text,
	"authorized_datetime" text,
	"category" jsonb,
	"category_id" text,
	"check_number" text,
	"counterparties" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"date" text NOT NULL,
	"datetime" text,
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
	"transaction_code" text,
	"transaction_type" varchar,
	"unofficial_currency_code" varchar,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"website" text,
	CONSTRAINT "plaid_transactions_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_account_details" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"snaptrade_account_id" varchar NOT NULL,
	"brokerage_authorization_id" varchar NOT NULL,
	"name" varchar,
	"number" varchar,
	"institution_name" varchar,
	"created_date" timestamp,
	"status" varchar,
	"raw_type" varchar,
	"sync_status" jsonb,
	"balance" jsonb,
	"meta" jsonb,
	"portfolio_group" varchar,
	"cash_restrictions" jsonb,
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "brokerage_account_details_snaptrade_account_id_unique" UNIQUE("snaptrade_account_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_accounts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brokerage_auth_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"account_number" varchar,
	"account_type" varchar,
	"name" varchar,
	"institution_name" varchar,
	"account_status" varchar,
	"created_date" timestamp,
	"balance_data" jsonb,
	"meta_data" jsonb,
	"portfolio_group" varchar,
	"cash_restrictions" jsonb,
	"sync_status" varchar,
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "brokerage_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_activities" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"snap_trade_account_id" varchar NOT NULL,
	"activity_id" varchar NOT NULL,
	"type" varchar,
	"symbol_id" varchar,
	"symbol_ticker" varchar,
	"raw_symbol" varchar,
	"symbol_description" varchar,
	"price" numeric(15, 4),
	"units" numeric(15, 6),
	"amount" numeric(15, 2),
	"fee" numeric(15, 2),
	"fx_rate" numeric(15, 6),
	"trade_date" timestamp,
	"settlement_date" timestamp,
	"currency_id" varchar,
	"currency_code" varchar,
	"currency_name" varchar,
	"exchange_id" varchar,
	"exchange_code" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"security_type_id" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"figi_code" varchar,
	"option_symbol" jsonb,
	"option_type" varchar,
	"description" text,
	"institution" varchar,
	"external_reference_id" varchar,
	"symbol" jsonb,
	"pagination" jsonb,
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "brokerage_activities_activity_id_unique" UNIQUE("activity_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_authorizations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"brokerage_slug" varchar NOT NULL,
	"authorization_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar,
	"brokerage" varchar NOT NULL,
	"is_disabled" integer,
	"disabled_date" timestamp,
	"is_eligible_for_payout" integer,
	"meta" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "brokerage_authorizations_authorization_id_unique" UNIQUE("authorization_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_balances" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"snaptrade_account_id" varchar NOT NULL,
	"currency_id" varchar,
	"currency_code" varchar,
	"currency_name" varchar,
	"cash" numeric(15, 2),
	"buying_power" numeric(15, 2),
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_balances" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"snap_trade_account_id" varchar NOT NULL,
	"brokerage_order_id" varchar NOT NULL,
	"status" varchar,
	"symbol_id" varchar,
	"symbol" varchar,
	"raw_symbol" varchar,
	"symbol_description" varchar,
	"action" varchar,
	"total_quantity" numeric(15, 6),
	"open_quantity" numeric(15, 6),
	"canceled_quantity" numeric(15, 6),
	"filled_quantity" numeric(15, 6),
	"execution_price" numeric(15, 2),
	"limit_price" numeric(15, 2),
	"stop_price" numeric(15, 2),
	"order_type" varchar,
	"time_in_force" varchar,
	"time_placed" timestamp,
	"time_updated" timestamp,
	"time_executed" timestamp,
	"expiry_date" timestamp,
	"currency_id" varchar,
	"currency_code" varchar,
	"currency_name" varchar,
	"exchange_id" varchar,
	"exchange_code" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"security_type_id" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"figi_code" varchar,
	"option_symbol" jsonb,
	"option_type" varchar,
	"strike_price" numeric(15, 2),
	"expiration_date" timestamp,
	"is_mini_option" boolean,
	"child_brokerage_order_ids" jsonb,
	"universal_symbol" jsonb,
	"quote_universal_symbol" jsonb,
	"quote_currency" jsonb,
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "brokerage_orders_brokerage_order_id_unique" UNIQUE("brokerage_order_id")
);
--> statement-breakpoint
ALTER TABLE "brokerage_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_portfolio_snapshots" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" varchar NOT NULL,
	"account_type" varchar NOT NULL,
	"snaptrade_account_id" varchar,
	"snapshot_date" timestamp NOT NULL,
	"total_value" numeric(15, 2),
	"cash_value" numeric(15, 2),
	"positions_value" numeric(15, 2),
	"buying_power" numeric(15, 2),
	"currency_code" varchar NOT NULL,
	"institution_name" varchar,
	"account_name" varchar,
	"positions_count" integer,
	"raw_balance_data" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "brokerage_positions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"user_id" text NOT NULL,
	"snap_trade_account_id" varchar NOT NULL,
	"symbol_id" varchar,
	"symbol" varchar,
	"raw_symbol" varchar,
	"symbol_description" varchar,
	"units" numeric(15, 6),
	"price" numeric(15, 2),
	"open_pnl" numeric(15, 2),
	"average_purchase_price" numeric(15, 4),
	"currency_id" varchar,
	"currency_code" varchar,
	"currency_name" varchar,
	"exchange_id" varchar,
	"exchange_code" varchar,
	"exchange_mic_code" varchar,
	"exchange_name" varchar,
	"security_type_id" varchar,
	"security_type_code" varchar,
	"security_type_description" varchar,
	"figi_code" varchar,
	"local_id" varchar,
	"is_quotable" boolean,
	"is_tradable" boolean,
	"last_sync" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brokerage_positions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "snaptrade_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"snaptrade_user_id" varchar NOT NULL,
	"snaptrade_user_secret" varchar NOT NULL,
	"registered_at" timestamp NOT NULL,
	"last_verified" timestamp,
	CONSTRAINT "snaptrade_users_snaptrade_user_id_unique" UNIQUE("snaptrade_user_id")
);
--> statement-breakpoint
ALTER TABLE "snaptrade_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rss_articles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"feed_ids" jsonb NOT NULL,
	"metadata" jsonb,
	"title" text NOT NULL,
	"description" text,
	"link" text NOT NULL,
	"published_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rss_articles_link_unique" UNIQUE("link")
);
--> statement-breakpoint
CREATE TABLE "rss_feeds" (
	"id" varchar PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_fetched" timestamp,
	"fetch_interval_minutes" varchar DEFAULT '5',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rss_feeds_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "event_articles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"financial_event_id" varchar NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"event_id" varchar NOT NULL,
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
	CONSTRAINT "financial_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"contact_email" text,
	"contact_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"icon" varchar DEFAULT 'target' NOT NULL,
	"target_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_plaid_item_id_plaid_items_plaid_item_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("plaid_item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_balances" ADD CONSTRAINT "plaid_balances_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ADD CONSTRAINT "plaid_credit_liabilities_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" ADD CONSTRAINT "plaid_recurring_streams_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_transactions" ADD CONSTRAINT "plaid_transactions_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ADD CONSTRAINT "brokerage_account_details_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ADD CONSTRAINT "brokerage_account_details_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD CONSTRAINT "brokerage_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD CONSTRAINT "brokerage_accounts_brokerage_auth_id_brokerage_authorizations_id_fk" FOREIGN KEY ("brokerage_auth_id") REFERENCES "public"."brokerage_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ADD CONSTRAINT "brokerage_activities_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ADD CONSTRAINT "brokerage_activities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" ADD CONSTRAINT "brokerage_authorizations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_balances" ADD CONSTRAINT "brokerage_balances_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_balances" ADD CONSTRAINT "brokerage_balances_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_orders" ADD CONSTRAINT "brokerage_orders_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_orders" ADD CONSTRAINT "brokerage_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ADD CONSTRAINT "brokerage_portfolio_snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_positions" ADD CONSTRAINT "brokerage_positions_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."brokerage_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokerage_positions" ADD CONSTRAINT "brokerage_positions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snaptrade_users" ADD CONSTRAINT "snaptrade_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_articles" ADD CONSTRAINT "event_articles_financial_event_id_financial_events_id_fk" FOREIGN KEY ("financial_event_id") REFERENCES "public"."financial_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chats_updated_at_idx" ON "chats" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "chats_chat_id_updated_at_idx" ON "chats" USING btree ("chat_id","updated_at");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages" USING btree ("chat_id","createdAt");--> statement-breakpoint
CREATE INDEX "parts_message_id_idx" ON "parts" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "parts_message_id_order_idx" ON "parts" USING btree ("message_id","order");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "plaid_accounts_item_id_idx" ON "plaid_accounts" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE INDEX "plaid_accounts_item_type_idx" ON "plaid_accounts" USING btree ("plaid_item_id","type");--> statement-breakpoint
CREATE INDEX "plaid_balances_account_id_idx" ON "plaid_balances" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_balances_last_updated_idx" ON "plaid_balances" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "plaid_balances_account_updated_idx" ON "plaid_balances" USING btree ("plaid_account_id","last_updated");--> statement-breakpoint
CREATE INDEX "plaid_institutions_id_idx" ON "plaid_institutions" USING btree ("plaid_institution_id");--> statement-breakpoint
CREATE INDEX "plaid_institutions_name_idx" ON "plaid_institutions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "plaid_items_institution_id_idx" ON "plaid_items" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "plaid_items_user_institution_idx" ON "plaid_items" USING btree ("user_id","institution_id");--> statement-breakpoint
CREATE INDEX "plaid_recurring_streams_account_id_idx" ON "plaid_recurring_streams" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_recurring_streams_account_date_type_idx" ON "plaid_recurring_streams" USING btree ("plaid_account_id","last_date","stream_type");--> statement-breakpoint
CREATE INDEX "plaid_transactions_account_id_idx" ON "plaid_transactions" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_transactions_date_idx" ON "plaid_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "plaid_transactions_account_date_idx" ON "plaid_transactions" USING btree ("plaid_account_id","date");--> statement-breakpoint
CREATE INDEX "plaid_transactions_pending_idx" ON "plaid_transactions" USING btree ("pending");--> statement-breakpoint
CREATE INDEX "plaid_transactions_date_pending_idx" ON "plaid_transactions" USING btree ("date","pending");--> statement-breakpoint
CREATE INDEX "brokerage_account_details_account_id_idx" ON "brokerage_account_details" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_details_user_id_idx" ON "brokerage_account_details" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_details_snaptrade_account_id_idx" ON "brokerage_account_details" USING btree ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_account_details_brokerage_authorization_id_idx" ON "brokerage_account_details" USING btree ("brokerage_authorization_id");--> statement-breakpoint
CREATE INDEX "brokerage_accounts_user_id_idx" ON "brokerage_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_accounts_brokerage_auth_id_idx" ON "brokerage_accounts" USING btree ("brokerage_auth_id");--> statement-breakpoint
CREATE INDEX "brokerage_accounts_account_id_idx" ON "brokerage_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_accounts_sync_status_idx" ON "brokerage_accounts" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX "brokerage_accounts_account_status_idx" ON "brokerage_accounts" USING btree ("account_status");--> statement-breakpoint
CREATE INDEX "brokerage_activities_account_id_idx" ON "brokerage_activities" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_activities_user_id_idx" ON "brokerage_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_activities_activity_id_idx" ON "brokerage_activities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "brokerage_activities_snap_trade_account_id_idx" ON "brokerage_activities" USING btree ("snap_trade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_activities_type_idx" ON "brokerage_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "brokerage_activities_symbol_ticker_idx" ON "brokerage_activities" USING btree ("symbol_ticker");--> statement-breakpoint
CREATE INDEX "brokerage_activities_trade_date_idx" ON "brokerage_activities" USING btree ("trade_date");--> statement-breakpoint
CREATE INDEX "brokerage_activities_settlement_date_idx" ON "brokerage_activities" USING btree ("settlement_date");--> statement-breakpoint
CREATE INDEX "brokerage_activities_user_trade_date_idx" ON "brokerage_activities" USING btree ("user_id","trade_date");--> statement-breakpoint
CREATE INDEX "brokerage_auths_user_id_idx" ON "brokerage_authorizations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_auths_brokerage_slug_idx" ON "brokerage_authorizations" USING btree ("brokerage_slug");--> statement-breakpoint
CREATE INDEX "brokerage_auths_authorization_id_idx" ON "brokerage_authorizations" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "brokerage_auths_is_disabled_idx" ON "brokerage_authorizations" USING btree ("is_disabled");--> statement-breakpoint
CREATE INDEX "brokerage_balances_account_id_idx" ON "brokerage_balances" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_balances_user_id_idx" ON "brokerage_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_balances_snaptrade_account_id_idx" ON "brokerage_balances" USING btree ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_balances_currency_code_idx" ON "brokerage_balances" USING btree ("currency_code");--> statement-breakpoint
CREATE UNIQUE INDEX "brokerage_balances_account_currency_idx" ON "brokerage_balances" USING btree ("account_id","currency_code");--> statement-breakpoint
CREATE INDEX "brokerage_orders_account_id_idx" ON "brokerage_orders" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_orders_user_id_idx" ON "brokerage_orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_orders_brokerage_order_id_idx" ON "brokerage_orders" USING btree ("brokerage_order_id");--> statement-breakpoint
CREATE INDEX "brokerage_orders_snap_trade_account_id_idx" ON "brokerage_orders" USING btree ("snap_trade_account_id");--> statement-breakpoint
CREATE INDEX "brokerage_orders_status_idx" ON "brokerage_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "brokerage_orders_symbol_idx" ON "brokerage_orders" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "brokerage_orders_time_placed_idx" ON "brokerage_orders" USING btree ("time_placed");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_user_id_idx" ON "brokerage_portfolio_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_account_id_idx" ON "brokerage_portfolio_snapshots" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_snaptrade_account_id_idx" ON "brokerage_portfolio_snapshots" USING btree ("snaptrade_account_id");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_snapshot_date_idx" ON "brokerage_portfolio_snapshots" USING btree ("snapshot_date");--> statement-breakpoint
CREATE INDEX "portfolio_snapshots_user_account_date_idx" ON "brokerage_portfolio_snapshots" USING btree ("user_id","account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "brokerage_positions_account_id_idx" ON "brokerage_positions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "brokerage_positions_user_id_idx" ON "brokerage_positions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "brokerage_positions_symbol_idx" ON "brokerage_positions" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "brokerage_positions_snap_trade_account_id_idx" ON "brokerage_positions" USING btree ("snap_trade_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brokerage_positions_account_symbol_idx" ON "brokerage_positions" USING btree ("account_id","symbol");--> statement-breakpoint
CREATE INDEX "snaptrade_users_snaptrade_user_id_idx" ON "snaptrade_users" USING btree ("snaptrade_user_id");--> statement-breakpoint
CREATE INDEX "rss_articles_link_where_idx" ON "rss_articles" USING btree ("link");--> statement-breakpoint
CREATE INDEX "rss_articles_published_date_idx" ON "rss_articles" USING btree ("published_date");--> statement-breakpoint
CREATE INDEX "rss_articles_created_at_idx" ON "rss_articles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_idx" ON "rss_feeds" USING btree ("company");--> statement-breakpoint
CREATE INDEX "rss_feeds_category_idx" ON "rss_feeds" USING btree ("category");--> statement-breakpoint
CREATE INDEX "rss_feeds_company_category_idx" ON "rss_feeds" USING btree ("company","category");--> statement-breakpoint
CREATE INDEX "rss_feeds_url_idx" ON "rss_feeds" USING btree ("url");--> statement-breakpoint
CREATE INDEX "rss_feeds_is_active_idx" ON "rss_feeds" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "rss_feeds_last_fetched_idx" ON "rss_feeds" USING btree ("last_fetched");--> statement-breakpoint
CREATE INDEX "event_articles_financial_event_id_idx" ON "event_articles" USING btree ("financial_event_id");--> statement-breakpoint
CREATE INDEX "event_articles_news_url_idx" ON "event_articles" USING btree ("news_url");--> statement-breakpoint
CREATE INDEX "event_articles_source_name_idx" ON "event_articles" USING btree ("source_name");--> statement-breakpoint
CREATE INDEX "event_articles_date_idx" ON "event_articles" USING btree ("date");--> statement-breakpoint
CREATE INDEX "financial_events_event_id_idx" ON "financial_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "financial_events_date_idx" ON "financial_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "financial_events_created_at_idx" ON "financial_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "financial_events_sentiment_idx" ON "financial_events" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "feedback" USING btree ("type");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "financial_goals_created_at_idx" ON "financial_goals" USING btree ("created_at");--> statement-breakpoint
CREATE POLICY "authenticated can read own chats" ON "chats" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("chats"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own chats" ON "chats" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("chats"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own chats" ON "chats" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("chats"."user_id" = (select auth.uid())) WITH CHECK ("chats"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own chats" ON "chats" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("chats"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can read messages from own chats" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "chats" 
        WHERE "chats"."chat_id" = "messages"."chat_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can insert messages to own chats" ON "messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM "chats" 
        WHERE "chats"."chat_id" = "messages"."chat_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can update messages in own chats" ON "messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "chats" 
        WHERE "chats"."chat_id" = "messages"."chat_id" 
        AND "chats"."user_id" = (select auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "chats" 
        WHERE "chats"."chat_id" = "messages"."chat_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can delete messages from own chats" ON "messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "chats" 
        WHERE "chats"."chat_id" = "messages"."chat_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can read parts from own chats" ON "parts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "messages" 
        JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
        WHERE "messages"."message_id" = "parts"."message_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can insert parts to own chats" ON "parts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM "messages" 
        JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
        WHERE "messages"."message_id" = "parts"."message_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can update parts in own chats" ON "parts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "messages" 
        JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
        WHERE "messages"."message_id" = "parts"."message_id" 
        AND "chats"."user_id" = (select auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "messages" 
        JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
        WHERE "messages"."message_id" = "parts"."message_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can delete parts from own chats" ON "parts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "messages" 
        JOIN "chats" ON "chats"."chat_id" = "messages"."chat_id"
        WHERE "messages"."message_id" = "parts"."message_id" 
        AND "chats"."user_id" = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "authenticated can read own accounts" ON "account" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("account"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own accounts" ON "account" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("account"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own accounts" ON "account" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("account"."user_id" = (select auth.uid())) WITH CHECK ("account"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own accounts" ON "account" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("account"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can read own sessions" ON "session" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("session"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own sessions" ON "session" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("session"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own sessions" ON "session" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("session"."user_id" = (select auth.uid())) WITH CHECK ("session"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own sessions" ON "session" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("session"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can read own user" ON "user" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "supabase_auth_admin can insert user" ON "user" AS PERMISSIVE FOR INSERT TO "supabase_auth_admin" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "authenticated can update own user" ON "user" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user"."id" = (select auth.uid())) WITH CHECK ("user"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "auth_read_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_items"
      WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
                SELECT 1 FROM "plaid_items"
                WHERE "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
                AND "plaid_items"."user_id" = (select auth.uid())
              ));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_accounts" ON "plaid_accounts" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
                SELECT 1 FROM "plaid_accounts"
                JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
                WHERE "plaid_accounts"."plaid_account_id" = "plaid_balances"."plaid_account_id"
                AND "plaid_items"."user_id" = (select auth.uid())
              ));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_balances" ON "plaid_balances" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
                SELECT 1 FROM "plaid_accounts"
                JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
                WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
                AND "plaid_items"."user_id" = (select auth.uid())
              ));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_institutions" ON "plaid_institutions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_read_institutions" ON "plaid_institutions" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_plaid_items" ON "plaid_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("plaid_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_items" ON "plaid_items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("plaid_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_items" ON "plaid_items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("plaid_items"."user_id" = (select auth.uid())) WITH CHECK ("plaid_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_items" ON "plaid_items" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("plaid_items"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_items" ON "plaid_items" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_items" ON "plaid_items" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_items" ON "plaid_items" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_items" ON "plaid_items" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
                SELECT 1 FROM "plaid_accounts"
                JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
                WHERE "plaid_accounts"."plaid_account_id" = "plaid_recurring_streams"."plaid_account_id"
                AND "plaid_items"."user_id" = (select auth.uid())
              ));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_recurring_streams" ON "plaid_recurring_streams" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "auth_read_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
                SELECT 1 FROM "plaid_accounts"
                JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
                WHERE "plaid_accounts"."plaid_account_id" = "plaid_transactions"."plaid_account_id"
                AND "plaid_items"."user_id" = (select auth.uid())
              ));--> statement-breakpoint
CREATE POLICY "webhook_read_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_plaid_transactions" ON "plaid_transactions" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage account details" ON "brokerage_account_details" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_account_details"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage account details" ON "brokerage_account_details" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_account_details"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage account details" ON "brokerage_account_details" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_account_details"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_account_details"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage account details" ON "brokerage_account_details" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_account_details"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_account_details" ON "brokerage_account_details" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_account_details" ON "brokerage_account_details" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_account_details" ON "brokerage_account_details" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_account_details" ON "brokerage_account_details" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage accounts" ON "brokerage_accounts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_accounts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage accounts" ON "brokerage_accounts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_accounts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage accounts" ON "brokerage_accounts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_accounts"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_accounts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage accounts" ON "brokerage_accounts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_accounts"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_accounts" ON "brokerage_accounts" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_accounts" ON "brokerage_accounts" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_accounts" ON "brokerage_accounts" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_accounts" ON "brokerage_accounts" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage activities" ON "brokerage_activities" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_activities"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage activities" ON "brokerage_activities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_activities"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage activities" ON "brokerage_activities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_activities"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_activities"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage activities" ON "brokerage_activities" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_activities"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_activities" ON "brokerage_activities" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_activities" ON "brokerage_activities" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_activities" ON "brokerage_activities" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_activities" ON "brokerage_activities" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_authorizations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_authorizations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_authorizations"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_authorizations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_authorizations"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_authorizations" ON "brokerage_authorizations" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage balances" ON "brokerage_balances" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_balances"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage balances" ON "brokerage_balances" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_balances"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage balances" ON "brokerage_balances" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_balances"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_balances"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage balances" ON "brokerage_balances" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_balances"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_balances" ON "brokerage_balances" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_balances" ON "brokerage_balances" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_balances" ON "brokerage_balances" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_balances" ON "brokerage_balances" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage orders" ON "brokerage_orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_orders"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage orders" ON "brokerage_orders" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_orders"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage orders" ON "brokerage_orders" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_orders"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_orders"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage orders" ON "brokerage_orders" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_orders"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_orders" ON "brokerage_orders" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_orders" ON "brokerage_orders" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_orders" ON "brokerage_orders" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_orders" ON "brokerage_orders" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_portfolio_snapshots"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_portfolio_snapshots"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_portfolio_snapshots"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_portfolio_snapshots"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage portfolio snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_portfolio_snapshots"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_portfolio_snapshots" ON "brokerage_portfolio_snapshots" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own brokerage positions" ON "brokerage_positions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("brokerage_positions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own brokerage positions" ON "brokerage_positions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("brokerage_positions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own brokerage positions" ON "brokerage_positions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("brokerage_positions"."user_id" = (select auth.uid())) WITH CHECK ("brokerage_positions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own brokerage positions" ON "brokerage_positions" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("brokerage_positions"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_brokerage_positions" ON "brokerage_positions" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_brokerage_positions" ON "brokerage_positions" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_brokerage_positions" ON "brokerage_positions" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_brokerage_positions" ON "brokerage_positions" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own snaptrade users" ON "snaptrade_users" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("snaptrade_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own snaptrade users" ON "snaptrade_users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("snaptrade_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own snaptrade users" ON "snaptrade_users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("snaptrade_users"."user_id" = (select auth.uid())) WITH CHECK ("snaptrade_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own snaptrade users" ON "snaptrade_users" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("snaptrade_users"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "webhook_read_snaptrade_users" ON "snaptrade_users" AS PERMISSIVE FOR SELECT TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "webhook_insert_snaptrade_users" ON "snaptrade_users" AS PERMISSIVE FOR INSERT TO "service-webhook" WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_update_snaptrade_users" ON "snaptrade_users" AS PERMISSIVE FOR UPDATE TO "service-webhook" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "webhook_delete_snaptrade_users" ON "snaptrade_users" AS PERMISSIVE FOR DELETE TO "service-webhook" USING (true);--> statement-breakpoint
CREATE POLICY "authenticated can read own feedback" ON "feedback" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("feedback"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own feedback" ON "feedback" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("feedback"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own feedback" ON "feedback" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("feedback"."user_id" = (select auth.uid())) WITH CHECK ("feedback"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own feedback" ON "feedback" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("feedback"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can read own financial goals" ON "financial_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("financial_goals"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can insert own financial goals" ON "financial_goals" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("financial_goals"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can update own financial goals" ON "financial_goals" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("financial_goals"."user_id" = (select auth.uid())) WITH CHECK ("financial_goals"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "authenticated can delete own financial goals" ON "financial_goals" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("financial_goals"."user_id" = (select auth.uid()));