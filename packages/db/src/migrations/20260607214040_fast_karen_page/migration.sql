CREATE TABLE "enrichment_event" (
	"brand_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fields_written" jsonb NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"location_id" uuid,
	"match_reason" text NOT NULL,
	"run_id" uuid NOT NULL,
	"sim" numeric(5,4),
	"transaction_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX "enrichment_event_transaction_id_idx" ON "enrichment_event" ("transaction_id");--> statement-breakpoint
CREATE INDEX "enrichment_event_run_id_idx" ON "enrichment_event" ("run_id");--> statement-breakpoint
CREATE INDEX "enrichment_event_created_at_idx" ON "enrichment_event" ("created_at");--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD CONSTRAINT "enrichment_event_brand_id_merchant_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "merchant"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD CONSTRAINT "enrichment_event_location_id_merchant_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "merchant_location"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD CONSTRAINT "enrichment_event_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;