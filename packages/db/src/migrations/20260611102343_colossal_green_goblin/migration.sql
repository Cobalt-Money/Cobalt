CREATE TABLE "enrichment"."plaid_sync_payload" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"item_id" text NOT NULL,
	"request" jsonb,
	"response" jsonb NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrichment"."enrichment_event" DROP CONSTRAINT "enrichment_event_transaction_id_transaction_id_fkey";--> statement-breakpoint
CREATE INDEX "plaid_sync_payload_item_id_created_at_idx" ON "enrichment"."plaid_sync_payload" ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "plaid_sync_payload_user_id_created_at_idx" ON "enrichment"."plaid_sync_payload" ("user_id","created_at");