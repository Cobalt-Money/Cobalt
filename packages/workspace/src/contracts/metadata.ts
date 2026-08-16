import { Context } from "effect";
import type { Effect } from "effect";
import type {
  FileRecordNotFoundError,
  InvalidStateTransitionError,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
} from "../domain/errors.js";
import type {
  CreateWorkspaceRecord,
  FileIdSchema,
  FileRecord,
  FileState,
  WorkspaceRecord,
  WorkspaceScope,
  WorkspaceState,
} from "../domain/schemas.js";

export type MetadataFailure =
  | FileRecordNotFoundError
  | InvalidStateTransitionError
  | WorkspaceConflictError
  | WorkspaceNotFoundError;

export class WorkspaceMetadataStore extends Context.Service<
  WorkspaceMetadataStore,
  {
    readonly createWorkspace: (
      record: CreateWorkspaceRecord,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceConflictError>;
    readonly getWorkspace: (
      scope: WorkspaceScope,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError>;
    readonly transitionWorkspace: (
      scope: WorkspaceScope,
      state: WorkspaceState,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError | InvalidStateTransitionError>;
    readonly listWorkspaces: (userId: string) => Effect.Effect<readonly WorkspaceRecord[]>;
    readonly deleteWorkspace: (
      scope: WorkspaceScope,
    ) => Effect.Effect<void, WorkspaceNotFoundError>;
    readonly createFile: (record: FileRecord) => Effect.Effect<FileRecord, WorkspaceConflictError>;
    readonly getFile: (
      scope: WorkspaceScope,
      fileId: typeof FileIdSchema.Type,
    ) => Effect.Effect<FileRecord, FileRecordNotFoundError>;
    readonly transitionFile: (
      scope: WorkspaceScope,
      fileId: typeof FileIdSchema.Type,
      state: FileState,
    ) => Effect.Effect<FileRecord, FileRecordNotFoundError | InvalidStateTransitionError>;
    readonly listFiles: (scope: WorkspaceScope) => Effect.Effect<readonly FileRecord[]>;
    readonly deleteFile: (
      scope: WorkspaceScope,
      fileId: typeof FileIdSchema.Type,
    ) => Effect.Effect<void, FileRecordNotFoundError>;
  }
>()("@cobalt-web/workspace/WorkspaceMetadataStore") {}
