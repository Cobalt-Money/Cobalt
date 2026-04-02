CREATE TABLE "plaid_investment_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" text NOT NULL,
	"security_id" text NOT NULL,
	"quantity" real NOT NULL,
	"institution_price" real NOT NULL,
	"institution_price_as_of" text,
	"institution_price_datetime" text,
	"institution_value" real NOT NULL,
	"cost_basis" real,
	"vested_quantity" real,
	"vested_value" real,
	"iso_currency_code" varchar,
	"unofficial_currency_code" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_investment_securities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"security_id" text NOT NULL,
	"isin" text,
	"cusip" text,
	"sedol" text,
	"institution_security_id" text,
	"institution_id" text,
	"proxy_security_id" text,
	"name" text,
	"ticker_symbol" varchar,
	"is_cash_equivalent" boolean,
	"type" varchar,
	"subtype" varchar,
	"close_price" real,
	"close_price_as_of" text,
	"update_datetime" text,
	"iso_currency_code" varchar,
	"unofficial_currency_code" varchar,
	"market_identifier_code" varchar,
	"sector" varchar,
	"industry" varchar,
	"option_contract" jsonb,
	"fixed_income" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_investment_securities_security_id_unique" UNIQUE("security_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_investment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" text NOT NULL,
	"investment_transaction_id" text NOT NULL,
	"security_id" text,
	"date" text NOT NULL,
	"name" text NOT NULL,
	"type" varchar NOT NULL,
	"subtype" varchar NOT NULL,
	"quantity" real NOT NULL,
	"price" real NOT NULL,
	"amount" real NOT NULL,
	"fees" real,
	"iso_currency_code" varchar,
	"unofficial_currency_code" varchar,
	"cancel_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_investment_transactions_investment_transaction_id_unique" UNIQUE("investment_transaction_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" ADD CONSTRAINT "plaid_investment_holdings_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_investment_holdings" ADD CONSTRAINT "plaid_investment_holdings_security_id_plaid_investment_securities_security_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."plaid_investment_securities"("security_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" ADD CONSTRAINT "plaid_investment_transactions_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_investment_transactions" ADD CONSTRAINT "plaid_investment_transactions_security_id_plaid_investment_securities_security_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."plaid_investment_securities"("security_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plaid_inv_holdings_account_idx" ON "plaid_investment_holdings" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_inv_holdings_security_idx" ON "plaid_investment_holdings" USING btree ("security_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_inv_holdings_account_security_idx" ON "plaid_investment_holdings" USING btree ("plaid_account_id","security_id");--> statement-breakpoint
CREATE INDEX "plaid_inv_securities_ticker_idx" ON "plaid_investment_securities" USING btree ("ticker_symbol");--> statement-breakpoint
CREATE INDEX "plaid_inv_securities_type_idx" ON "plaid_investment_securities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "plaid_inv_securities_sector_idx" ON "plaid_investment_securities" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "plaid_inv_tx_account_idx" ON "plaid_investment_transactions" USING btree ("plaid_account_id");--> statement-breakpoint
CREATE INDEX "plaid_inv_tx_date_idx" ON "plaid_investment_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "plaid_inv_tx_account_date_idx" ON "plaid_investment_transactions" USING btree ("plaid_account_id","date");--> statement-breakpoint
CREATE INDEX "plaid_inv_tx_security_idx" ON "plaid_investment_transactions" USING btree ("security_id");--> statement-breakpoint
CREATE INDEX "plaid_inv_tx_type_idx" ON "plaid_investment_transactions" USING btree ("type");--> statement-breakpoint
CREATE POLICY "auth_read_plaid_inv_holdings" ON "plaid_investment_holdings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_holdings"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_inv_holdings" ON "plaid_investment_holdings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_holdings"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_inv_holdings" ON "plaid_investment_holdings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_holdings"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_holdings"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_inv_holdings" ON "plaid_investment_holdings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_holdings"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_read_plaid_inv_transactions" ON "plaid_investment_transactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_inv_transactions" ON "plaid_investment_transactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_inv_transactions" ON "plaid_investment_transactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    )) WITH CHECK (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_inv_transactions" ON "plaid_investment_transactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "plaid_accounts"
      JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
      WHERE "plaid_accounts"."plaid_account_id" = "plaid_investment_transactions"."plaid_account_id"
      AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
    ));