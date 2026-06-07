CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS cube;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS earthdistance;--> statement-breakpoint
CREATE TABLE "merchant" (
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"canonical_name" text NOT NULL,
	"category_system_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"domain" text,
	"domain_guess_attempts" jsonb DEFAULT '[]' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_chain" boolean DEFAULT false NOT NULL,
	"location_count" integer DEFAULT 0 NOT NULL,
	"logo_url" text,
	"name_normalized" text NOT NULL,
	"subtype" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_location" (
	"address" text NOT NULL,
	"also_seen_in" jsonb DEFAULT '[]' NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'US' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"merchant_id" uuid,
	"phone" text,
	"postal_code" text,
	"raw_name" text NOT NULL,
	"region" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"store_number" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "merchant_name_trgm_idx" ON "merchant" USING gin ("name_normalized" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "merchant_aliases_gin_idx" ON "merchant" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "merchant_category_idx" ON "merchant" ("category_system_key");--> statement-breakpoint
CREATE INDEX "merchant_tags_gin_idx" ON "merchant" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_domain_uniq" ON "merchant" ("domain") WHERE (domain IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_location_source_uniq" ON "merchant_location" ("source","source_id");--> statement-breakpoint
CREATE INDEX "merchant_location_merchant_idx" ON "merchant_location" ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_location_region_city_idx" ON "merchant_location" ("region","city");--> statement-breakpoint
CREATE INDEX "merchant_location_postal_region_idx" ON "merchant_location" ("postal_code","region");--> statement-breakpoint
CREATE INDEX "merchant_location_store_number_idx" ON "merchant_location" ("store_number") WHERE (store_number IS NOT NULL);--> statement-breakpoint
CREATE INDEX "merchant_location_geo_idx" ON "merchant_location" USING gist (ll_to_earth(lat, lon));--> statement-breakpoint
ALTER TABLE "merchant_location" ADD CONSTRAINT "merchant_location_merchant_id_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchant"("id") ON DELETE CASCADE;