ALTER TABLE "user" ADD COLUMN "onboarded_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "onboarding_step" text;--> statement-breakpoint
UPDATE "user" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL;