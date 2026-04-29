ALTER TABLE "transaction_edit" ALTER COLUMN "field" SET DATA TYPE text USING "field"::text;--> statement-breakpoint
DROP TYPE "transaction_edit_field";