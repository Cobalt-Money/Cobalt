CREATE TABLE "plaid_mortgage_liabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" text NOT NULL,
	"account_number" text,
	"current_late_fee" real,
	"escrow_balance" real,
	"has_pmi" boolean,
	"has_prepayment_penalty" boolean,
	"interest_rate" jsonb,
	"last_payment_amount" real,
	"last_payment_date" text,
	"loan_type_description" text,
	"loan_term" text,
	"maturity_date" text,
	"next_monthly_payment" real,
	"next_payment_due_date" text,
	"origination_date" text,
	"origination_principal_amount" real,
	"past_due_amount" real,
	"property_address" jsonb,
	"ytd_interest_paid" real,
	"ytd_principal_paid" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_mortgage_liabilities_plaid_account_id_unique" UNIQUE("plaid_account_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_mortgage_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "plaid_student_loan_liabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plaid_account_id" text NOT NULL,
	"account_number" text,
	"disbursement_dates" jsonb,
	"expected_payoff_date" text,
	"guarantor" text,
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
	"pslf_status" jsonb,
	"repayment_plan" jsonb,
	"sequence_number" text,
	"servicer_address" jsonb,
	"ytd_interest_paid" real,
	"ytd_principal_paid" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_student_loan_liabilities_plaid_account_id_unique" UNIQUE("plaid_account_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_student_loan_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ADD COLUMN "last_statement_issue_date" text;--> statement-breakpoint
ALTER TABLE "plaid_mortgage_liabilities" ADD CONSTRAINT "plaid_mortgage_liabilities_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_student_loan_liabilities" ADD CONSTRAINT "plaid_student_loan_liabilities_plaid_account_id_plaid_accounts_plaid_account_id_fk" FOREIGN KEY ("plaid_account_id") REFERENCES "public"."plaid_accounts"("plaid_account_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ADD CONSTRAINT "plaid_credit_liabilities_plaid_account_id_unique" UNIQUE("plaid_account_id");--> statement-breakpoint
CREATE POLICY "auth_read_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_mortgage_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_mortgage_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_mortgage_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_mortgage_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_mortgage_liabilities" ON "plaid_mortgage_liabilities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_mortgage_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_read_plaid_student_loans" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_student_loan_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_insert_plaid_student_loans" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_student_loan_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_update_plaid_student_loans" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_student_loan_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_student_loan_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
CREATE POLICY "auth_delete_plaid_student_loans" ON "plaid_student_loan_liabilities" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_student_loan_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
ALTER POLICY "auth_read_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
ALTER POLICY "auth_insert_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
ALTER POLICY "auth_update_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));--> statement-breakpoint
ALTER POLICY "auth_delete_plaid_credit_liabilities" ON "plaid_credit_liabilities" TO authenticated USING (EXISTS (
    SELECT 1 FROM "plaid_accounts"
    JOIN "plaid_items" ON "plaid_items"."plaid_item_id" = "plaid_accounts"."plaid_item_id"
    WHERE "plaid_accounts"."plaid_account_id" = "plaid_credit_liabilities"."plaid_account_id"
    AND "plaid_items"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))
  ));