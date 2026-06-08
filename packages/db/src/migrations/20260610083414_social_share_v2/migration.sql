CREATE TABLE "social_category_blocklist" (
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "social_category_blocklist_pkey" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "social_merchant_blocklist" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"merchant_name" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "social_merchant_blocklist_pkey" PRIMARY KEY("user_id","merchant_name")
);
--> statement-breakpoint
CREATE TABLE "social_share_settings" (
	"share_amount" boolean DEFAULT true NOT NULL,
	"share_card" boolean DEFAULT true NOT NULL,
	"share_date" boolean DEFAULT true NOT NULL,
	"share_max_amount_cents" integer,
	"share_merchant" boolean DEFAULT true NOT NULL,
	"share_min_amount_cents" integer,
	"share_note" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
DROP TABLE "social_privacy_zone";--> statement-breakpoint
DROP TABLE "social_visibility_rule";--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN "card_name" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN "institution_name" text;--> statement-breakpoint
ALTER TABLE "social_post" DROP COLUMN "amount_bucket";--> statement-breakpoint
ALTER TABLE "social_post" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_post" ALTER COLUMN "lat" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "social_post" ALTER COLUMN "lon" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "social_post" ALTER COLUMN "merchant_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "social_category_blocklist" ADD CONSTRAINT "social_category_blocklist_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_merchant_blocklist" ADD CONSTRAINT "social_merchant_blocklist_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_share_settings" ADD CONSTRAINT "social_share_settings_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
