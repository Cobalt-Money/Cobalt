CREATE TYPE "import_job_status" AS ENUM('uploaded', 'parsed', 'mapped', 'committed', 'failed');--> statement-breakpoint
CREATE TYPE "import_source" AS ENUM('mint');--> statement-breakpoint
CREATE TABLE "import_job" (
	"account_map" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"file_key" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"original_filename" text,
	"source" "import_source" NOT NULL,
	"status" "import_job_status" DEFAULT 'uploaded'::"import_job_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_staged_transaction" (
	"amount" numeric(19,4) NOT NULL,
	"date" date NOT NULL,
	"dedupe_match_id" uuid,
	"external_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"import_job_id" uuid NOT NULL,
	"is_split" boolean DEFAULT false NOT NULL,
	"is_transfer" boolean DEFAULT false NOT NULL,
	"merchant" text NOT NULL,
	"notes" text,
	"original_description" text,
	"parse_error" text,
	"raw_blob" jsonb,
	"source_account_name" text NOT NULL,
	"source_category_name" text,
	"tags" text[]
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "import_job_id" uuid;--> statement-breakpoint
CREATE INDEX "import_job_user_id_idx" ON "import_job" ("user_id");--> statement-breakpoint
CREATE INDEX "import_job_user_status_idx" ON "import_job" ("user_id","status");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_job_id_idx" ON "import_staged_transaction" ("import_job_id");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_dedupe_match_idx" ON "import_staged_transaction" ("dedupe_match_id");--> statement-breakpoint
CREATE INDEX "transaction_import_job_id_idx" ON "transaction" ("import_job_id");--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_dedupe_match_id_transaction_id_fkey" FOREIGN KEY ("dedupe_match_id") REFERENCES "transaction"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE SET NULL;