import { agentWorkspaces, workspaceFiles } from "@cobalt-web/db/schema/zero-schema";
import {
  FileRecordNotFoundError,
  InvalidStateTransitionError,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
} from "@cobalt-web/workspace";
import type { WorkspaceMetadataStore } from "@cobalt-web/workspace/metadata";
import type {
  FileRecord,
  FileState,
  WorkspaceRecord,
  WorkspaceScope,
  WorkspaceState,
} from "@cobalt-web/workspace/schemas";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { AnyRelations } from "drizzle-orm";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Context } from "effect";
import { Effect } from "effect";

export interface WorkspaceMetadataStoreOptions {
  readonly provider: string;
}

const workspaceTransitions: Readonly<Record<WorkspaceState, readonly WorkspaceState[]>> = {
  created: ["starting", "running", "deleted"],
  deleted: [],
  failed: ["starting", "deleted"],
  running: ["stopping", "stopped", "failed", "deleted"],
  starting: ["running", "failed", "stopped"],
  stopped: ["starting", "running", "deleted"],
  stopping: ["stopped", "failed"],
};
const fileTransitions: Readonly<Record<FileState, readonly FileState[]>> = {
  deleted: [],
  failed: ["pending", "deleted"],
  pending: ["ready", "failed", "deleted"],
  ready: ["deleted"],
};

const isoTimestamp = (value: string): string => new Date(value).toISOString();
const toWorkspaceRecord = (row: typeof agentWorkspaces.$inferSelect): WorkspaceRecord => ({
  createdAt: isoTimestamp(row.createdAt),
  state: row.status,
  updatedAt: isoTimestamp(row.updatedAt),
  userId: row.userId,
  workspaceId: row.workspaceId,
});
const toFileRecord = (row: typeof workspaceFiles.$inferSelect): FileRecord => ({
  checksum: row.checksum,
  contentType: row.mimeType,
  createdAt: isoTimestamp(row.createdAt),
  fileId: row.fileId,
  ...(row.idempotencyKey ? { idempotencyKey: row.idempotencyKey } : {}),
  kind: row.source,
  name: row.originalFilename,
  objectKey: row.objectKey,
  path: row.path,
  size: row.byteSize,
  state: row.status,
  updatedAt: isoTimestamp(row.updatedAt),
  userId: row.userId,
  workspaceId: row.workspaceId,
});
const allowedSources = <State extends string>(
  transitions: Readonly<Record<State, readonly State[]>>,
  target: State,
): State[] => {
  const sources: State[] = [];
  for (const [source, targets] of Object.entries(transitions) as [State, readonly State[]][]) {
    if (targets.includes(target)) {
      sources.push(source);
    }
  }
  return sources;
};

export const makeWorkspaceMetadataStore = <
  TQueryResult extends PgQueryResultHKT,
  TSchema extends Record<string, unknown>,
  TRelations extends AnyRelations,
>(
  database: PgAsyncDatabase<TQueryResult, TSchema, TRelations>,
  options: WorkspaceMetadataStoreOptions,
): Context.Service.Shape<typeof WorkspaceMetadataStore> => {
  if (options.provider.length === 0) {
    throw new Error("Workspace metadata provider must not be empty");
  }

  const getWorkspace = (
    value: WorkspaceScope,
  ): Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError> =>
    Effect.promise(async () => {
      const rows = await database
        .select()
        .from(agentWorkspaces)
        .where(
          and(
            eq(agentWorkspaces.userId, value.userId),
            eq(agentWorkspaces.workspaceId, value.workspaceId),
          ),
        )
        .limit(1);
      return rows[0];
    }).pipe(
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(toWorkspaceRecord(row))
          : Effect.fail(new WorkspaceNotFoundError(value)),
      ),
    );

  const getFile = (
    value: WorkspaceScope,
    fileId: string,
  ): Effect.Effect<FileRecord, FileRecordNotFoundError> =>
    Effect.promise(async () => {
      const rows = await database
        .select()
        .from(workspaceFiles)
        .where(
          and(
            eq(workspaceFiles.userId, value.userId),
            eq(workspaceFiles.workspaceId, value.workspaceId),
            eq(workspaceFiles.fileId, fileId),
          ),
        )
        .limit(1);
      return rows[0];
    }).pipe(
      Effect.flatMap((row) =>
        row
          ? Effect.succeed(toFileRecord(row))
          : Effect.fail(new FileRecordNotFoundError({ ...value, fileId })),
      ),
    );

  return {
    createFile: (record) =>
      Effect.promise(async () => {
        if (record.idempotencyKey) {
          const [existing] = await database
            .select()
            .from(workspaceFiles)
            .where(
              and(
                eq(workspaceFiles.userId, record.userId),
                eq(workspaceFiles.workspaceId, record.workspaceId),
                eq(workspaceFiles.idempotencyKey, record.idempotencyKey),
              ),
            )
            .limit(1);
          if (existing) {
            return { kind: "record" as const, row: existing };
          }
        }
        const [inserted] = await database
          .insert(workspaceFiles)
          .values({
            byteSize: record.size,
            checksum: record.checksum,
            createdAt: record.createdAt,
            fileId: record.fileId,
            idempotencyKey: record.idempotencyKey,
            mimeType: record.contentType,
            objectKey: record.objectKey,
            originalFilename: record.name,
            path: record.path,
            source: record.kind,
            status: record.state,
            updatedAt: record.updatedAt,
            userId: record.userId,
            workspaceId: record.workspaceId,
          })
          .onConflictDoNothing()
          .returning();
        if (inserted) {
          return { kind: "record" as const, row: inserted };
        }
        if (record.idempotencyKey) {
          const [retried] = await database
            .select()
            .from(workspaceFiles)
            .where(
              and(
                eq(workspaceFiles.userId, record.userId),
                eq(workspaceFiles.workspaceId, record.workspaceId),
                eq(workspaceFiles.idempotencyKey, record.idempotencyKey),
              ),
            )
            .limit(1);
          if (retried) {
            return { kind: "record" as const, row: retried };
          }
        }
        return { kind: "conflict" as const };
      }).pipe(
        Effect.flatMap((result) =>
          result.kind === "record"
            ? Effect.succeed(toFileRecord(result.row))
            : Effect.fail(
                new WorkspaceConflictError({
                  reason: "File already exists",
                  resource: `${record.userId}/${record.workspaceId}/${record.fileId}`,
                }),
              ),
        ),
      ),

    createWorkspace: (record) =>
      Effect.promise(async () => {
        const rows = await database
          .insert(agentWorkspaces)
          .values({
            provider: options.provider,
            status: record.state,
            userId: record.userId,
            workspaceId: record.workspaceId,
          })
          .onConflictDoNothing()
          .returning();
        return rows[0];
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(toWorkspaceRecord(row))
            : Effect.fail(
                new WorkspaceConflictError({
                  reason: "Workspace already exists",
                  resource: `${record.userId}/${record.workspaceId}`,
                }),
              ),
        ),
      ),

    deleteFile: (value, fileId) =>
      Effect.promise(async () => {
        const rows = await database
          .delete(workspaceFiles)
          .where(
            and(
              eq(workspaceFiles.userId, value.userId),
              eq(workspaceFiles.workspaceId, value.workspaceId),
              eq(workspaceFiles.fileId, fileId),
            ),
          )
          .returning({ fileId: workspaceFiles.fileId });
        return rows.length > 0;
      }).pipe(
        Effect.flatMap((deleted) =>
          deleted ? Effect.void : Effect.fail(new FileRecordNotFoundError({ ...value, fileId })),
        ),
      ),

    deleteWorkspace: (value) =>
      Effect.promise(async () => {
        const rows = await database
          .delete(agentWorkspaces)
          .where(
            and(
              eq(agentWorkspaces.userId, value.userId),
              eq(agentWorkspaces.workspaceId, value.workspaceId),
            ),
          )
          .returning({ workspaceId: agentWorkspaces.workspaceId });
        return rows.length > 0;
      }).pipe(
        Effect.flatMap((deleted) =>
          deleted ? Effect.void : Effect.fail(new WorkspaceNotFoundError(value)),
        ),
      ),

    getFile,
    getWorkspace,
    listFiles: (value) =>
      Effect.promise(async () => {
        const rows = await database
          .select()
          .from(workspaceFiles)
          .where(
            and(
              eq(workspaceFiles.userId, value.userId),
              eq(workspaceFiles.workspaceId, value.workspaceId),
            ),
          )
          .orderBy(asc(workspaceFiles.createdAt), asc(workspaceFiles.fileId));
        return rows.map(toFileRecord);
      }),
    listWorkspaces: (userId) =>
      Effect.promise(async () => {
        const rows = await database
          .select()
          .from(agentWorkspaces)
          .where(eq(agentWorkspaces.userId, userId))
          .orderBy(asc(agentWorkspaces.createdAt), asc(agentWorkspaces.workspaceId));
        return rows.map(toWorkspaceRecord);
      }),

    transitionFile: (value, fileId, state) => {
      const sources = allowedSources(fileTransitions, state);
      return Effect.promise(async () => {
        if (sources.length === 0) {
          return;
        }
        const rows = await database
          .update(workspaceFiles)
          .set({ status: state, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(workspaceFiles.userId, value.userId),
              eq(workspaceFiles.workspaceId, value.workspaceId),
              eq(workspaceFiles.fileId, fileId),
              inArray(workspaceFiles.status, sources),
            ),
          )
          .returning();
        return rows[0];
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(toFileRecord(row))
            : getFile(value, fileId).pipe(
                Effect.flatMap((current) =>
                  current.state === state
                    ? Effect.succeed(current)
                    : Effect.fail(
                        new InvalidStateTransitionError({
                          entity: "file",
                          from: current.state,
                          to: state,
                        }),
                      ),
                ),
              ),
        ),
      );
    },

    transitionWorkspace: (value, state) => {
      const sources = allowedSources(workspaceTransitions, state);
      return Effect.promise(async () => {
        if (sources.length === 0) {
          return;
        }
        const rows = await database
          .update(agentWorkspaces)
          .set({ status: state, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(agentWorkspaces.userId, value.userId),
              eq(agentWorkspaces.workspaceId, value.workspaceId),
              inArray(agentWorkspaces.status, sources),
            ),
          )
          .returning();
        return rows[0];
      }).pipe(
        Effect.flatMap((row) =>
          row
            ? Effect.succeed(toWorkspaceRecord(row))
            : getWorkspace(value).pipe(
                Effect.flatMap((current) =>
                  current.state === state
                    ? Effect.succeed(current)
                    : Effect.fail(
                        new InvalidStateTransitionError({
                          entity: "workspace",
                          from: current.state,
                          to: state,
                        }),
                      ),
                ),
              ),
        ),
      );
    },
  };
};
