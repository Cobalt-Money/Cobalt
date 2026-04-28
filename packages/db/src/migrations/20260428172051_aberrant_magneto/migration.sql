CREATE TYPE "transaction_edit_actor" AS ENUM('system', 'user');--> statement-breakpoint
CREATE TYPE "transaction_edit_field" AS ENUM('amount', 'category', 'date', 'name', 'notes');--> statement-breakpoint
CREATE TABLE "transaction_edit" (
	"actor" "transaction_edit_actor" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"field" "transaction_edit_field" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"new_value" jsonb,
	"old_value" jsonb,
	"transaction_id" uuid NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "locked_fields" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ HAND-WRITTEN BACKFILL (SRI-181)                                           ║
-- ║ Migrate user_override_{name,date,category} → transaction_edit + locked.   ║
-- ║ For each override: insert audit row, promote override into source column, ║
-- ║ append field to locked_fields. Notes column gets locked if non-null.      ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

INSERT INTO "transaction_edit" (transaction_id, user_id, actor, field, old_value, new_value)
SELECT id, user_id, 'user', 'name', to_jsonb(name), to_jsonb(user_override_name)
FROM "transaction"
WHERE user_override_name IS NOT NULL AND user_override_name <> name;--> statement-breakpoint

UPDATE "transaction" SET name = user_override_name
WHERE user_override_name IS NOT NULL AND user_override_name <> name;--> statement-breakpoint

UPDATE "transaction" SET locked_fields = locked_fields || '["name"]'::jsonb
WHERE user_override_name IS NOT NULL AND NOT (locked_fields ? 'name');--> statement-breakpoint

INSERT INTO "transaction_edit" (transaction_id, user_id, actor, field, old_value, new_value)
SELECT id, user_id, 'user', 'date', to_jsonb(date::text), to_jsonb(user_override_date::text)
FROM "transaction"
WHERE user_override_date IS NOT NULL AND user_override_date <> date;--> statement-breakpoint

UPDATE "transaction" SET date = user_override_date
WHERE user_override_date IS NOT NULL AND user_override_date <> date;--> statement-breakpoint

UPDATE "transaction" SET locked_fields = locked_fields || '["date"]'::jsonb
WHERE user_override_date IS NOT NULL AND NOT (locked_fields ? 'date');--> statement-breakpoint

INSERT INTO "transaction_edit" (transaction_id, user_id, actor, field, old_value, new_value)
SELECT id, user_id, 'user', 'category',
  jsonb_build_object('confidence', category_confidence, 'detailed', category_detail, 'primary', category),
  jsonb_build_object('detailed', user_override_category #>> '{detailed}', 'primary', user_override_category #>> '{primary}')
FROM "transaction"
WHERE user_override_category IS NOT NULL;--> statement-breakpoint

UPDATE "transaction" SET
  category = user_override_category #>> '{primary}',
  category_detail = user_override_category #>> '{detailed}',
  category_confidence = NULL
WHERE user_override_category IS NOT NULL;--> statement-breakpoint

UPDATE "transaction" SET locked_fields = locked_fields || '["category"]'::jsonb
WHERE user_override_category IS NOT NULL AND NOT (locked_fields ? 'category');--> statement-breakpoint

UPDATE "transaction" SET locked_fields = locked_fields || '["notes"]'::jsonb
WHERE notes IS NOT NULL AND NOT (locked_fields ? 'notes');--> statement-breakpoint

-- ╚═══ end backfill ══════════════════════════════════════════════════════════╝

ALTER TABLE "transaction" DROP COLUMN "user_override_category";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "user_override_date";--> statement-breakpoint
ALTER TABLE "transaction" DROP COLUMN "user_override_name";--> statement-breakpoint
CREATE INDEX "transaction_edit_transaction_id_idx" ON "transaction_edit" ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_edit_created_at_idx" ON "transaction_edit" ("created_at");--> statement-breakpoint
ALTER TABLE "transaction_edit" ADD CONSTRAINT "transaction_edit_transaction_id_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction_edit" ADD CONSTRAINT "transaction_edit_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;