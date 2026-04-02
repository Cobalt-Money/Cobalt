ALTER TABLE "plaid_items" ADD COLUMN "new_accounts_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN "pending_disconnect_at" timestamp;