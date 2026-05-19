CREATE TABLE "tag" (
	"archived_at" timestamp with time zone,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "tag_name_length_check" CHECK (length("name") <= 50),
	CONSTRAINT "tag_color_check" CHECK ("color" IN ('red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'slate', 'stone'))
);
--> statement-breakpoint
CREATE TABLE "transaction_tag" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tag_id" uuid,
	"transaction_id" uuid,
	CONSTRAINT "transaction_tag_pkey" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tag_user_id_lower_name_idx" ON "tag" ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "tag_user_id_active_idx" ON "tag" ("user_id") WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "transaction_tag_tag_id_idx" ON "transaction_tag" ("tag_id");--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_tag_id_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_tag" ADD CONSTRAINT "transaction_tag_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;