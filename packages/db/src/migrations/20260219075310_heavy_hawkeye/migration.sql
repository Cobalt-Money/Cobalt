-- Migration: varchar (generateId/CUID) -> uuid (gen_random_uuid)
-- Phase 3: SnapTrade tables - add/backfill/switch/drop with FK handling

-- 1. brokerage_authorizations (referenced by brokerage_accounts.brokerageAuthId)
ALTER TABLE "brokerage_authorizations" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_authorizations" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" DROP CONSTRAINT IF EXISTS "brokerage_accounts_brokerage_auth_id_brokerage_authorizations_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD COLUMN "brokerage_auth_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_accounts" ba SET "brokerage_auth_id_new" = ba2."id_new" FROM "brokerage_authorizations" ba2 WHERE ba."brokerage_auth_id" = ba2."id";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" DROP COLUMN "brokerage_auth_id";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" RENAME COLUMN "brokerage_auth_id_new" TO "brokerage_auth_id";--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" DROP CONSTRAINT "brokerage_authorizations_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_authorizations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD CONSTRAINT "brokerage_accounts_brokerage_auth_id_brokerage_authorizations_id_fk" FOREIGN KEY ("brokerage_auth_id") REFERENCES "brokerage_authorizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ALTER COLUMN "brokerage_auth_id" SET NOT NULL;--> statement-breakpoint

-- 2. brokerage_accounts (referenced by account_details, balances, positions, activities, orders)
ALTER TABLE "brokerage_accounts" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_accounts" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" DROP CONSTRAINT IF EXISTS "brokerage_account_details_account_id_brokerage_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_balances" DROP CONSTRAINT IF EXISTS "brokerage_balances_account_id_brokerage_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_positions" DROP CONSTRAINT IF EXISTS "brokerage_positions_account_id_brokerage_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_activities" DROP CONSTRAINT IF EXISTS "brokerage_activities_account_id_brokerage_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_orders" DROP CONSTRAINT IF EXISTS "brokerage_orders_account_id_brokerage_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ADD COLUMN "account_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_account_details" bad SET "account_id_new" = ba."id_new" FROM "brokerage_accounts" ba WHERE bad."account_id" = ba."id";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" RENAME COLUMN "account_id_new" TO "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_balances" ADD COLUMN "account_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_balances" bb SET "account_id_new" = ba."id_new" FROM "brokerage_accounts" ba WHERE bb."account_id" = ba."id";--> statement-breakpoint
ALTER TABLE "brokerage_balances" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_balances" RENAME COLUMN "account_id_new" TO "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_positions" ADD COLUMN "account_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_positions" bp SET "account_id_new" = ba."id_new" FROM "brokerage_accounts" ba WHERE bp."account_id" = ba."id";--> statement-breakpoint
ALTER TABLE "brokerage_positions" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_positions" RENAME COLUMN "account_id_new" TO "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_activities" ADD COLUMN "account_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_activities" ba SET "account_id_new" = bac."id_new" FROM "brokerage_accounts" bac WHERE ba."account_id" = bac."id";--> statement-breakpoint
ALTER TABLE "brokerage_activities" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_activities" RENAME COLUMN "account_id_new" TO "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_orders" ADD COLUMN "account_id_new" uuid;--> statement-breakpoint
UPDATE "brokerage_orders" bo SET "account_id_new" = ba."id_new" FROM "brokerage_accounts" ba WHERE bo."account_id" = ba."id";--> statement-breakpoint
ALTER TABLE "brokerage_orders" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "brokerage_orders" RENAME COLUMN "account_id_new" TO "account_id";--> statement-breakpoint
UPDATE "brokerage_portfolio_snapshots" bps SET account_id = ba."id_new"::text FROM "brokerage_accounts" ba WHERE bps.account_type = 'brokerage' AND bps.account_id = ba."id";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" DROP CONSTRAINT "brokerage_accounts_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ADD CONSTRAINT "brokerage_account_details_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "brokerage_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_account_details_account_id_idx" ON "brokerage_account_details" ("account_id");--> statement-breakpoint
ALTER TABLE "brokerage_balances" ADD CONSTRAINT "brokerage_balances_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "brokerage_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_balances" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_balances_account_id_idx" ON "brokerage_balances" ("account_id");--> statement-breakpoint
ALTER TABLE "brokerage_positions" ADD CONSTRAINT "brokerage_positions_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "brokerage_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_positions" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_positions_account_id_idx" ON "brokerage_positions" ("account_id");--> statement-breakpoint
ALTER TABLE "brokerage_activities" ADD CONSTRAINT "brokerage_activities_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "brokerage_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_activities_account_id_idx" ON "brokerage_activities" ("account_id");--> statement-breakpoint
ALTER TABLE "brokerage_orders" ADD CONSTRAINT "brokerage_orders_account_id_brokerage_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "brokerage_accounts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "brokerage_orders" ALTER COLUMN "account_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brokerage_orders_account_id_idx" ON "brokerage_orders" ("account_id");--> statement-breakpoint

-- 3. brokerage_account_details id
ALTER TABLE "brokerage_account_details" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_account_details" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_account_details" DROP CONSTRAINT "brokerage_account_details_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_account_details" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- 4. brokerage_balances id
ALTER TABLE "brokerage_balances" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_balances" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_balances" DROP CONSTRAINT "brokerage_balances_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_balances" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_balances" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_balances" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_balances" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "brokerage_balances_account_currency_idx" ON "brokerage_balances" ("account_id", "currency_code");--> statement-breakpoint

-- 5. brokerage_positions id
ALTER TABLE "brokerage_positions" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_positions" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_positions" DROP CONSTRAINT "brokerage_positions_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_positions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_positions" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_positions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_positions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "brokerage_positions_account_symbol_idx" ON "brokerage_positions" ("account_id", "symbol");--> statement-breakpoint

-- 6. brokerage_activities id
ALTER TABLE "brokerage_activities" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_activities" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_activities" DROP CONSTRAINT "brokerage_activities_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_activities" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_activities" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_activities" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_activities" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- 7. brokerage_orders id
ALTER TABLE "brokerage_orders" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_orders" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_orders" DROP CONSTRAINT "brokerage_orders_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_orders" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_orders" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_orders" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- 8. brokerage_portfolio_snapshots id
ALTER TABLE "brokerage_portfolio_snapshots" ADD COLUMN "id_new" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
UPDATE "brokerage_portfolio_snapshots" SET "id_new" = gen_random_uuid() WHERE "id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" DROP CONSTRAINT "brokerage_portfolio_snapshots_pkey";--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" RENAME COLUMN "id_new" TO "id";--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "brokerage_portfolio_snapshots" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
