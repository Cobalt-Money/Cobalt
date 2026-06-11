ALTER TABLE "social_post" ADD COLUMN IF NOT EXISTS "category_system_key" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN IF NOT EXISTS "logo_url" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN IF NOT EXISTS "website" text;
