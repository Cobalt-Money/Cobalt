CREATE TABLE "social_invite_decline" (
	"declined_at" timestamp DEFAULT now() NOT NULL,
	"declined_by_user_id" text NOT NULL,
	"id" text PRIMARY KEY,
	"invite_id" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "social_invite_decline_unique" ON "social_invite_decline" ("invite_id","declined_by_user_id");--> statement-breakpoint
CREATE INDEX "social_invite_decline_decliner_idx" ON "social_invite_decline" ("declined_by_user_id");--> statement-breakpoint
ALTER TABLE "social_invite_decline" ADD CONSTRAINT "social_invite_decline_declined_by_user_id_user_id_fkey" FOREIGN KEY ("declined_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "social_invite_decline" ADD CONSTRAINT "social_invite_decline_invite_id_social_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "social_invite"("id") ON DELETE CASCADE;