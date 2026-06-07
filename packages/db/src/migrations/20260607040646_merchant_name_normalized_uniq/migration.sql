ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "domain_source" text;--> statement-breakpoint
ALTER TABLE "merchant" ADD COLUMN IF NOT EXISTS "places_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "merchant_name_normalized_uniq" ON "merchant" ("name_normalized") WHERE (deleted_at IS NULL);
