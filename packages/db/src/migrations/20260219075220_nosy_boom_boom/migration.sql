-- Migration: varchar (generateId/CUID) -> uuid (gen_random_uuid)
-- Phase 2: Plaid tables - add/backfill/switch/drop pattern

-- plaid_accounts
ALTER TABLE "plaid_accounts" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_accounts" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_accounts" DROP CONSTRAINT "plaid_accounts_pkey";--> statement-breakpoint
ALTER TABLE "plaid_accounts" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_accounts" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- plaid_balances
ALTER TABLE "plaid_balances" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_balances" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_balances" DROP CONSTRAINT "plaid_balances_pkey";--> statement-breakpoint
ALTER TABLE "plaid_balances" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_balances" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_balances" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_balances" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- plaid_transactions
ALTER TABLE "plaid_transactions" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_transactions" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_transactions" DROP CONSTRAINT "plaid_transactions_pkey";--> statement-breakpoint
ALTER TABLE "plaid_transactions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_transactions" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_transactions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_transactions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- plaid_recurring_streams
ALTER TABLE "plaid_recurring_streams" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_recurring_streams" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" DROP CONSTRAINT "plaid_recurring_streams_pkey";--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_recurring_streams" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- plaid_credit_liabilities
ALTER TABLE "plaid_credit_liabilities" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "plaid_credit_liabilities" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" DROP CONSTRAINT "plaid_credit_liabilities_pkey";--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "plaid_credit_liabilities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
