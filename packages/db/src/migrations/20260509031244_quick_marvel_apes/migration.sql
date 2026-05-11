CREATE TYPE "import_job_status" AS ENUM('uploaded', 'column_mapped', 'account_mapped', 'category_mapped', 'committing', 'committed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "import_source" AS ENUM('csv');--> statement-breakpoint
CREATE TABLE "account_mapping_cache" (
	"cobalt_account_id" uuid,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_label" text,
	"user_id" text,
	CONSTRAINT "account_mapping_cache_pkey" PRIMARY KEY("user_id","source_label")
);
--> statement-breakpoint
CREATE TABLE "category_mapping_cache" (
	"action" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"new_name" text,
	"source_label" text,
	"target_category_id" uuid,
	"user_id" text,
	CONSTRAINT "category_mapping_cache_pkey" PRIMARY KEY("user_id","source_label")
);
--> statement-breakpoint
CREATE TABLE "csv_mapping_cache" (
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"header_hash" text,
	"mapping" jsonb NOT NULL,
	"user_id" text,
	CONSTRAINT "csv_mapping_cache_pkey" PRIMARY KEY("user_id","header_hash")
);
--> statement-breakpoint
CREATE TABLE "import_job" (
	"account_resolution" jsonb,
	"cancelled_at" timestamp with time zone,
	"category_resolution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"file_hash" text,
	"file_key" text,
	"headers" text[] DEFAULT '{}'::text[] NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"original_filename" text,
	"progress" jsonb,
	"sample_rows" jsonb,
	"schema_confirmed_at" timestamp with time zone,
	"schema_mapping" jsonb,
	"source" "import_source" NOT NULL,
	"status" "import_job_status" DEFAULT 'uploaded'::"import_job_status" NOT NULL,
	"summary" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"workflow_run_id" text
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
ALTER TABLE "transaction" ADD COLUMN "import_hash" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "import_job_id" uuid;--> statement-breakpoint
CREATE INDEX "import_job_user_id_idx" ON "import_job" ("user_id");--> statement-breakpoint
CREATE INDEX "import_job_user_status_idx" ON "import_job" ("user_id","status");--> statement-breakpoint
CREATE INDEX "import_job_user_file_hash_idx" ON "import_job" ("user_id","file_hash");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_job_id_idx" ON "import_staged_transaction" ("import_job_id");--> statement-breakpoint
CREATE INDEX "import_staged_transaction_dedupe_match_idx" ON "import_staged_transaction" ("dedupe_match_id");--> statement-breakpoint
CREATE INDEX "transaction_import_job_id_idx" ON "transaction" ("import_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_user_import_hash_idx" ON "transaction" ("user_id","import_hash") WHERE import_hash IS NOT NULL;--> statement-breakpoint
ALTER TABLE "account_mapping_cache" ADD CONSTRAINT "account_mapping_cache_QIANh4m9DjQ9_fkey" FOREIGN KEY ("cobalt_account_id") REFERENCES "financial_account"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "account_mapping_cache" ADD CONSTRAINT "account_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "category_mapping_cache" ADD CONSTRAINT "category_mapping_cache_target_category_id_category_id_fkey" FOREIGN KEY ("target_category_id") REFERENCES "category"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "category_mapping_cache" ADD CONSTRAINT "category_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "csv_mapping_cache" ADD CONSTRAINT "csv_mapping_cache_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_dedupe_match_id_transaction_id_fkey" FOREIGN KEY ("dedupe_match_id") REFERENCES "transaction"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "import_staged_transaction" ADD CONSTRAINT "import_staged_transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_import_job_id_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_job"("id") ON DELETE SET NULL;