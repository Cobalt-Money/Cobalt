CREATE TABLE "agent_workspaces" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"runtime_id" text,
	"sandbox_created_at" timestamp with time zone,
	"sandbox_expires_at" timestamp with time zone,
	"sandbox_last_active_at" timestamp with time zone,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"workspace_id" uuid,
	CONSTRAINT "agent_workspaces_pkey" PRIMARY KEY("user_id","workspace_id"),
	CONSTRAINT "agent_workspaces_status_check" CHECK ("status" IN ('created', 'starting', 'running', 'stopping', 'stopped', 'failed', 'deleted')),
	CONSTRAINT "agent_workspaces_provider_check" CHECK (length("provider") > 0)
);
--> statement-breakpoint
CREATE TABLE "workspace_files" (
	"byte_size" bigint NOT NULL,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"file_id" uuid,
	"idempotency_key" text,
	"mime_type" text NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"path" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text,
	"workspace_id" uuid,
	CONSTRAINT "workspace_files_pkey" PRIMARY KEY("user_id","workspace_id","file_id"),
	CONSTRAINT "workspace_files_byte_size_check" CHECK ("byte_size" >= 0),
	CONSTRAINT "workspace_files_source_check" CHECK ("source" IN ('upload', 'artifact')),
	CONSTRAINT "workspace_files_status_check" CHECK ("status" IN ('pending', 'ready', 'failed', 'deleted')),
	CONSTRAINT "workspace_files_metadata_check" CHECK (length("object_key") > 0 AND length("original_filename") > 0 AND length("mime_type") > 0 AND length("checksum") > 0 AND length("path") > 0)
);
--> statement-breakpoint
CREATE INDEX "agent_workspaces_owner_status_updated_at_idx" ON "agent_workspaces" ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "agent_workspaces_status_updated_at_idx" ON "agent_workspaces" ("status","updated_at");--> statement-breakpoint
CREATE INDEX "agent_workspaces_runtime_id_idx" ON "agent_workspaces" ("runtime_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_files_object_key_uidx" ON "workspace_files" ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_files_owner_workspace_idempotency_key_uidx" ON "workspace_files" ("user_id","workspace_id","idempotency_key") WHERE "idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "workspace_files_owner_workspace_created_at_idx" ON "workspace_files" ("user_id","workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "workspace_files_owner_workspace_status_updated_at_idx" ON "workspace_files" ("user_id","workspace_id","status","updated_at");--> statement-breakpoint
ALTER TABLE "agent_workspaces" ADD CONSTRAINT "agent_workspaces_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_files" ADD CONSTRAINT "workspace_files_owner_workspace_fk" FOREIGN KEY ("user_id","workspace_id") REFERENCES "agent_workspaces"("user_id","workspace_id") ON DELETE CASCADE;