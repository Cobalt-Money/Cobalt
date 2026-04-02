CREATE TABLE "message_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message_id" varchar NOT NULL,
	"vote" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_votes_user_message_unique" UNIQUE("user_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "message_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_votes_user_id_idx" ON "message_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_votes_message_id_idx" ON "message_votes" USING btree ("message_id");--> statement-breakpoint
CREATE POLICY "authenticated can read own message votes" ON "message_votes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("message_votes"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "authenticated can insert own message votes" ON "message_votes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("message_votes"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "authenticated can update own message votes" ON "message_votes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("message_votes"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true))) WITH CHECK ("message_votes"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));--> statement-breakpoint
CREATE POLICY "authenticated can delete own message votes" ON "message_votes" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("message_votes"."user_id" = (SELECT current_setting('request.jwt.claim.sub', true)));