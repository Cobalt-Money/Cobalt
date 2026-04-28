CREATE TYPE "account_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "activity_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "security_source" AS ENUM('plaid', 'snaptrade', 'manual');--> statement-breakpoint
CREATE TYPE "transaction_source" AS ENUM('plaid', 'manual');--> statement-breakpoint
CREATE TABLE "balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"current" numeric(19,4) NOT NULL,
	"available" numeric(19,4),
	"limit" numeric(19,4),
	"buying_power" numeric(19,4),
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"user_override_credit_limit" numeric(19,4),
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_liability_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL UNIQUE,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"verification_status" text,
	"status" text,
	"persistent_account_id" text,
	"institution_name" text,
	"portfolio_group" text,
	"sync_status" text,
	"last_sync_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone,
	"user_override_credit_limit" numeric(19,4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_account_connection_arc" CHECK (num_nonnulls(plaid_connection_id, snaptrade_authorization_id) <= 1)
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
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"vested_quantity" numeric(28,10),
	"vested_value" numeric(19,4),
	"is_quotable" boolean,
	"is_tradable" boolean,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_activity_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"cancel_transaction_id" text,
	"external_reference_id" text,
	"option_symbol" text,
	"option_type" text,
	"fx_rate" numeric(19,8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mortgage_liability_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL UNIQUE,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"external_id" text NOT NULL UNIQUE,
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
	"iso_currency_code" text,
	"child_brokerage_order_ids" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"plaid_item_id" text NOT NULL UNIQUE,
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
CREATE TABLE "recurring_stream_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "transaction_source" NOT NULL,
	"external_id" text,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL,
	"merchant_name" text,
	"category" jsonb,
	"category_id" text,
	"personal_finance_category" jsonb,
	"frequency" text NOT NULL,
	"status" text NOT NULL,
	"stream_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_user_modified" boolean DEFAULT false NOT NULL,
	"last_user_modified_datetime" timestamp with time zone,
	"average_amount" numeric(19,4) NOT NULL,
	"last_amount" numeric(19,4) NOT NULL,
	"first_date" date NOT NULL,
	"last_date" date NOT NULL,
	"predicted_next_date" date,
	"transaction_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"is_cash_equivalent" boolean,
	"close_price" numeric(28,10),
	"close_price_as_of" date,
	"update_datetime" timestamp with time zone,
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
CREATE TABLE "snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "account_source",
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"current" numeric(19,4) NOT NULL,
	"available" numeric(19,4),
	"limit" numeric(19,4),
	"buying_power" numeric(19,4),
	"positions_value" numeric(19,4),
	"positions_count" integer,
	"iso_currency_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snaptrade_authorization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"authorization_id" text NOT NULL UNIQUE,
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
	"snaptrade_user_id" text NOT NULL UNIQUE,
	"snaptrade_user_secret" text NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_loan_liability_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL UNIQUE,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_v2" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source" "transaction_source" NOT NULL,
	"external_id" text,
	"account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(19,4) NOT NULL,
	"date" date NOT NULL,
	"datetime" timestamp with time zone,
	"authorized_date" date,
	"authorized_datetime" timestamp with time zone,
	"name" text NOT NULL,
	"merchant_name" text,
	"merchant_entity_id" text,
	"logo_url" text,
	"website" text,
	"category" jsonb,
	"category_id" text,
	"personal_finance_category" jsonb,
	"personal_finance_category_icon_url" text,
	"counterparties" jsonb,
	"location" jsonb,
	"payment_meta" jsonb,
	"payment_channel" text,
	"pending" boolean DEFAULT false NOT NULL,
	"pending_transaction_id" text,
	"transaction_code" text,
	"transaction_type" text,
	"account_owner" text,
	"check_number" text,
	"iso_currency_code" text,
	"unofficial_currency_code" text,
	"original_description" text,
	"notes" jsonb,
	"user_override_category" jsonb,
	"user_override_date" date,
	"user_override_location" jsonb,
	"user_override_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "balance_account_id_unique" ON "balance" ("account_id");--> statement-breakpoint
CREATE INDEX "balance_user_id_idx" ON "balance" ("user_id");--> statement-breakpoint
CREATE INDEX "balance_account_updated_idx" ON "balance" ("account_id","updated_at");--> statement-breakpoint
CREATE INDEX "credit_liability_v2_user_id_idx" ON "credit_liability_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_account_user_id_idx" ON "financial_account" ("user_id");--> statement-breakpoint
CREATE INDEX "financial_account_user_type_idx" ON "financial_account" ("user_id","type");--> statement-breakpoint
CREATE INDEX "financial_account_plaid_connection_id_idx" ON "financial_account" ("plaid_connection_id");--> statement-breakpoint
CREATE INDEX "financial_account_snaptrade_auth_id_idx" ON "financial_account" ("snaptrade_authorization_id");--> statement-breakpoint
CREATE INDEX "financial_account_persistent_id_idx" ON "financial_account" ("persistent_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_account_source_external_id_idx" ON "financial_account" ("source","external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "holding_account_id_idx" ON "holding" ("account_id");--> statement-breakpoint
CREATE INDEX "holding_user_id_idx" ON "holding" ("user_id");--> statement-breakpoint
CREATE INDEX "holding_security_id_idx" ON "holding" ("security_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holding_account_security_idx" ON "holding" ("account_id","security_id");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_account_idx" ON "investment_activity_v2" ("account_id");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_user_idx" ON "investment_activity_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_date_idx" ON "investment_activity_v2" ("date");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_account_date_idx" ON "investment_activity_v2" ("account_id","date");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_security_idx" ON "investment_activity_v2" ("security_id");--> statement-breakpoint
CREATE INDEX "investment_activity_v2_type_idx" ON "investment_activity_v2" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_activity_v2_source_external_id_idx" ON "investment_activity_v2" ("source","external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "mortgage_liability_v2_user_id_idx" ON "mortgage_liability_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "orders_account_id_idx" ON "orders" ("account_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" ("user_id");--> statement-breakpoint
CREATE INDEX "orders_security_id_idx" ON "orders" ("security_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" ("status");--> statement-breakpoint
CREATE INDEX "orders_time_placed_idx" ON "orders" ("time_placed");--> statement-breakpoint
CREATE INDEX "plaid_connection_user_id_idx" ON "plaid_connection" ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_connection_institution_id_idx" ON "plaid_connection" ("institution_id");--> statement-breakpoint
CREATE INDEX "plaid_connection_user_institution_idx" ON "plaid_connection" ("user_id","institution_id");--> statement-breakpoint
CREATE INDEX "recurring_stream_v2_account_id_idx" ON "recurring_stream_v2" ("account_id");--> statement-breakpoint
CREATE INDEX "recurring_stream_v2_user_id_idx" ON "recurring_stream_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_stream_v2_account_date_type_idx" ON "recurring_stream_v2" ("account_id","last_date","stream_type");--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_stream_v2_source_external_id_idx" ON "recurring_stream_v2" ("source","external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "security_ticker_idx" ON "security" ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "security_figi_idx" ON "security" ("figi_code");--> statement-breakpoint
CREATE INDEX "security_cusip_idx" ON "security" ("cusip");--> statement-breakpoint
CREATE INDEX "security_type_idx" ON "security" ("type");--> statement-breakpoint
CREATE INDEX "security_sector_idx" ON "security" ("sector");--> statement-breakpoint
CREATE UNIQUE INDEX "security_source_external_id_idx" ON "security" ("source","external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "snapshot_account_id_idx" ON "snapshot" ("account_id");--> statement-breakpoint
CREATE INDEX "snapshot_user_id_idx" ON "snapshot" ("user_id");--> statement-breakpoint
CREATE INDEX "snapshot_date_idx" ON "snapshot" ("snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "snapshot_account_date_idx" ON "snapshot" ("account_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_user_id_idx" ON "snaptrade_authorization" ("user_id");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_brokerage_slug_idx" ON "snaptrade_authorization" ("brokerage_slug");--> statement-breakpoint
CREATE INDEX "snaptrade_auth_is_disabled_idx" ON "snaptrade_authorization" ("is_disabled");--> statement-breakpoint
CREATE INDEX "snaptrade_user_snaptrade_user_id_idx" ON "snaptrade_user" ("snaptrade_user_id");--> statement-breakpoint
CREATE INDEX "student_loan_liability_v2_user_id_idx" ON "student_loan_liability_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_v2_account_id_idx" ON "transaction_v2" ("account_id");--> statement-breakpoint
CREATE INDEX "transaction_v2_user_id_idx" ON "transaction_v2" ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_v2_date_idx" ON "transaction_v2" ("date");--> statement-breakpoint
CREATE INDEX "transaction_v2_account_date_idx" ON "transaction_v2" ("account_id","date");--> statement-breakpoint
CREATE INDEX "transaction_v2_pending_idx" ON "transaction_v2" ("pending");--> statement-breakpoint
CREATE INDEX "transaction_v2_date_pending_idx" ON "transaction_v2" ("date","pending");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_v2_source_external_id_idx" ON "transaction_v2" ("source","external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "balance" ADD CONSTRAINT "balance_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "balance" ADD CONSTRAINT "balance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_liability_v2" ADD CONSTRAINT "credit_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "credit_liability_v2" ADD CONSTRAINT "credit_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_plaid_connection_id_plaid_connection_id_fkey" FOREIGN KEY ("plaid_connection_id") REFERENCES "plaid_connection"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "financial_account" ADD CONSTRAINT "financial_account_gjEcqbMwVh7T_fkey" FOREIGN KEY ("snaptrade_authorization_id") REFERENCES "snaptrade_authorization"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "holding" ADD CONSTRAINT "holding_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity_v2" ADD CONSTRAINT "investment_activity_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity_v2" ADD CONSTRAINT "investment_activity_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "investment_activity_v2" ADD CONSTRAINT "investment_activity_v2_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "mortgage_liability_v2" ADD CONSTRAINT "mortgage_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mortgage_liability_v2" ADD CONSTRAINT "mortgage_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_security_id_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "security"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "plaid_connection" ADD CONSTRAINT "plaid_connection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring_stream_v2" ADD CONSTRAINT "recurring_stream_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring_stream_v2" ADD CONSTRAINT "recurring_stream_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snapshot" ADD CONSTRAINT "snapshot_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snaptrade_authorization" ADD CONSTRAINT "snaptrade_authorization_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snaptrade_user" ADD CONSTRAINT "snaptrade_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_loan_liability_v2" ADD CONSTRAINT "student_loan_liability_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_loan_liability_v2" ADD CONSTRAINT "student_loan_liability_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_account_id_financial_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_v2" ADD CONSTRAINT "transaction_v2_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;