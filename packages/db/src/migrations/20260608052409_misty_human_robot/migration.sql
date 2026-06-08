ALTER TABLE "social_invite_redemption" DROP CONSTRAINT "social_invite_redemption_invite_id_social_invite_id_fkey";--> statement-breakpoint
ALTER TABLE "social_invite" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "social_invite" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ALTER COLUMN "id" SET DATA TYPE text USING "id"::text;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ALTER COLUMN "invite_id" SET DATA TYPE text USING "invite_id"::text;--> statement-breakpoint
ALTER TABLE "social_invite_redemption" ADD CONSTRAINT "social_invite_redemption_invite_id_social_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "social_invite"("id") ON DELETE CASCADE;
