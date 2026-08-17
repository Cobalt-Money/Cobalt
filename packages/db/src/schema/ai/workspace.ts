import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../users/auth/auth";

const workspaceStates = [
  "created",
  "starting",
  "running",
  "stopping",
  "stopped",
  "failed",
  "deleted",
] as const;
const fileStates = ["pending", "ready", "failed", "deleted"] as const;
const fileSources = ["upload", "artifact"] as const;

export const agentWorkspaces = pgTable(
  "agent_workspaces",
  {
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    provider: text("provider").notNull(),
    runtimeId: text("runtime_id"),
    sandboxCreatedAt: timestamp("sandbox_created_at", { mode: "string", withTimezone: true }),
    sandboxExpiresAt: timestamp("sandbox_expires_at", { mode: "string", withTimezone: true }),
    sandboxLastActiveAt: timestamp("sandbox_last_active_at", {
      mode: "string",
      withTimezone: true,
    }),
    status: text("status", { enum: workspaceStates }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.workspaceId] }),
    check(
      "agent_workspaces_status_check",
      sql`${table.status} IN ('created', 'starting', 'running', 'stopping', 'stopped', 'failed', 'deleted')`,
    ),
    check("agent_workspaces_provider_check", sql`length(${table.provider}) > 0`),
    index("agent_workspaces_owner_status_updated_at_idx").on(
      table.userId,
      table.status,
      table.updatedAt,
    ),
    index("agent_workspaces_status_updated_at_idx").on(table.status, table.updatedAt),
    index("agent_workspaces_runtime_id_idx").on(table.runtimeId),
  ],
);

export const workspaceFiles = pgTable(
  "workspace_files",
  {
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    checksum: text("checksum").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    fileId: uuid("file_id").notNull(),
    idempotencyKey: text("idempotency_key"),
    mimeType: text("mime_type").notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    path: text("path").notNull(),
    source: text("source", { enum: fileSources }).notNull(),
    status: text("status", { enum: fileStates }).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.workspaceId, table.fileId] }),
    foreignKey({
      columns: [table.userId, table.workspaceId],
      foreignColumns: [agentWorkspaces.userId, agentWorkspaces.workspaceId],
      name: "workspace_files_owner_workspace_fk",
    }).onDelete("cascade"),
    check("workspace_files_byte_size_check", sql`${table.byteSize} >= 0`),
    check("workspace_files_source_check", sql`${table.source} IN ('upload', 'artifact')`),
    check(
      "workspace_files_status_check",
      sql`${table.status} IN ('pending', 'ready', 'failed', 'deleted')`,
    ),
    check(
      "workspace_files_metadata_check",
      sql`length(${table.objectKey}) > 0 AND length(${table.originalFilename}) > 0 AND length(${table.mimeType}) > 0 AND length(${table.checksum}) > 0 AND length(${table.path}) > 0`,
    ),
    uniqueIndex("workspace_files_object_key_uidx").on(table.objectKey),
    uniqueIndex("workspace_files_owner_workspace_idempotency_key_uidx")
      .on(table.userId, table.workspaceId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("workspace_files_owner_workspace_created_at_idx").on(
      table.userId,
      table.workspaceId,
      table.createdAt,
    ),
    index("workspace_files_owner_workspace_status_updated_at_idx").on(
      table.userId,
      table.workspaceId,
      table.status,
      table.updatedAt,
    ),
  ],
);

export type AgentWorkspace = typeof agentWorkspaces.$inferSelect;
export type WorkspaceFile = typeof workspaceFiles.$inferSelect;
