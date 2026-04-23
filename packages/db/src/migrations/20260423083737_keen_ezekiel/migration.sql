ALTER TABLE "bank_account" ADD COLUMN "persistent_account_id" text;--> statement-breakpoint
CREATE INDEX "bank_account_persistent_id_idx" ON "bank_account" ("persistent_account_id");