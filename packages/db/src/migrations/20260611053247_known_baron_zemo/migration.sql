DO $$ BEGIN
 CREATE TYPE "social_share_location_precision" AS ENUM('exact', 'city', 'hidden');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "social_share_settings" ADD COLUMN "location_precision" "social_share_location_precision" DEFAULT 'exact'::"social_share_location_precision" NOT NULL;
