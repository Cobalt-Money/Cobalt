CREATE TABLE "place" (
	"address" text NOT NULL,
	"also_seen_in" jsonb DEFAULT '[]' NOT NULL,
	"brand_domain" text,
	"brand_key" text NOT NULL,
	"brand_logo_url" text,
	"brand_name" text NOT NULL,
	"brand_name_compact" text NOT NULL,
	"brand_name_normalized" text NOT NULL,
	"category" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_active" boolean DEFAULT true NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"phone" text,
	"postal_code" text,
	"raw_name" text NOT NULL,
	"region" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"source_updated_at" timestamp with time zone,
	"store_number" text,
	"subtype" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrichment_event" DROP CONSTRAINT "enrichment_event_brand_id_merchant_id_fkey";--> statement-breakpoint
ALTER TABLE "enrichment_event" DROP CONSTRAINT "enrichment_event_location_id_merchant_location_id_fkey";--> statement-breakpoint
ALTER TABLE "merchant_location" DROP CONSTRAINT "merchant_location_merchant_id_merchant_id_fkey";--> statement-breakpoint
DROP TABLE "merchant";--> statement-breakpoint
DROP TABLE "merchant_location";--> statement-breakpoint
-- Old audit rows reference dropped merchant / merchant_location FKs and have no
-- match_confidence value. Forensically useless once their targets are gone.
DELETE FROM "enrichment_event";--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD COLUMN "match_confidence" numeric(5,4) NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD COLUMN "place_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "place_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "place_match_confidence" numeric(5,4);--> statement-breakpoint
ALTER TABLE "enrichment_event" DROP COLUMN "brand_id";--> statement-breakpoint
ALTER TABLE "enrichment_event" DROP COLUMN "location_id";--> statement-breakpoint
CREATE INDEX "enrichment_event_place_id_idx" ON "enrichment_event" ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_source_uniq" ON "place" ("source","source_id");--> statement-breakpoint
CREATE INDEX "place_brand_key_idx" ON "place" ("brand_key") WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_brand_name_normalized_trgm" ON "place" USING gin ("brand_name_normalized" gin_trgm_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_brand_name_compact_trgm" ON "place" USING gin ("brand_name_compact" gin_trgm_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_region_city_idx" ON "place" ("region","city") WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_postal_region_idx" ON "place" ("postal_code","region") WHERE (postal_code IS NOT NULL AND deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_store_number_idx" ON "place" ("brand_key","store_number") WHERE (store_number IS NOT NULL AND deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_geo_idx" ON "place" USING gist (ll_to_earth(lat, lon)) WHERE (lat IS NOT NULL AND lon IS NOT NULL AND deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_category_idx" ON "place" ("category") WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "place_brand_domain_idx" ON "place" ("brand_domain") WHERE (brand_domain IS NOT NULL AND deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "transaction_place_id_idx" ON "transaction" ("place_id") WHERE (place_id IS NOT NULL);--> statement-breakpoint
ALTER TABLE "enrichment_event" ADD CONSTRAINT "enrichment_event_place_id_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_place_id_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "place"("id") ON DELETE SET NULL;