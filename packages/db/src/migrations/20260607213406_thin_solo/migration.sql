ALTER TABLE "transaction" ADD COLUMN "pfc_detailed" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "pfc_primary" text;--> statement-breakpoint
CREATE INDEX "transaction_pfc_primary_idx" ON "transaction" ("pfc_primary");