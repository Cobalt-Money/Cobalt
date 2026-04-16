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
	"website" text
);
--> statement-breakpoint
ALTER TABLE "fundamentals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "tickers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "oauth_client" ALTER COLUMN "client_id" SET DATA TYPE varchar(255) USING "client_id"::varchar(255);--> statement-breakpoint
ALTER TABLE "oauth_access_token" ALTER COLUMN "token" SET DATA TYPE varchar(255) USING "token"::varchar(255);--> statement-breakpoint
CREATE INDEX "tickers_exchange_idx" ON "tickers" ("exchange");--> statement-breakpoint
CREATE INDEX "tickers_cik_idx" ON "tickers" ("cik");--> statement-breakpoint
CREATE INDEX "tickers_is_active_idx" ON "tickers" ("is_active");--> statement-breakpoint
ALTER TABLE "fundamentals" ADD CONSTRAINT "fundamentals_symbol_tickers_symbol_fkey" FOREIGN KEY ("symbol") REFERENCES "tickers"("symbol") ON DELETE CASCADE;--> statement-breakpoint
CREATE POLICY "app_full_access" ON "fundamentals" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "fundamentals" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);--> statement-breakpoint
CREATE POLICY "app_full_access" ON "tickers" AS PERMISSIVE FOR ALL TO "pg_write_all_data" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "agent_select_public" ON "tickers" AS PERMISSIVE FOR SELECT TO "pg_read_all_data" USING (true);