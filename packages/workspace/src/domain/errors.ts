import { Schema } from "effect";

// oxlint-disable max-classes-per-file, new-cap, throw-new-error -- Effect's TaggedError factory is used in an extends clause, not thrown directly.

const ScopeFields = {
  userId: Schema.NonEmptyString,
  workspaceId: Schema.NonEmptyString,
};

export class WorkspacePathError extends Schema.TaggedError<WorkspacePathError>()(
  "WorkspacePathError",
  {
    operation: Schema.Literals(["read", "write", "list"]),
    path: Schema.String,
    reason: Schema.String,
  },
) {}

export class ObjectKeyError extends Schema.TaggedError<ObjectKeyError>()("ObjectKeyError", {
  key: Schema.String,
  reason: Schema.String,
}) {}

export class WorkspaceNotFoundError extends Schema.TaggedError<WorkspaceNotFoundError>()(
  "WorkspaceNotFoundError",
  ScopeFields,
) {}

export class FileRecordNotFoundError extends Schema.TaggedError<FileRecordNotFoundError>()(
  "FileRecordNotFoundError",
  { ...ScopeFields, fileId: Schema.String },
) {}

export class StorageObjectNotFoundError extends Schema.TaggedError<StorageObjectNotFoundError>()(
  "StorageObjectNotFoundError",
  { key: Schema.String },
) {}

export class ExecutionNotFoundError extends Schema.TaggedError<ExecutionNotFoundError>()(
  "ExecutionNotFoundError",
  { ...ScopeFields, executionId: Schema.String },
) {}

export class InvalidStateTransitionError extends Schema.TaggedError<InvalidStateTransitionError>()(
  "InvalidStateTransitionError",
  { entity: Schema.Literals(["workspace", "file"]), from: Schema.String, to: Schema.String },
) {}

export class InvalidExecutionStreamError extends Schema.TaggedError<InvalidExecutionStreamError>()(
  "InvalidExecutionStreamError",
  { executionId: Schema.String, reason: Schema.String },
) {}

export class WorkspaceConflictError extends Schema.TaggedError<WorkspaceConflictError>()(
  "WorkspaceConflictError",
  { reason: Schema.String, resource: Schema.String },
) {}

export class WorkspaceRuntimeError extends Schema.TaggedError<WorkspaceRuntimeError>()(
  "WorkspaceRuntimeError",
  { operation: Schema.String, reason: Schema.String },
) {}

export class BridgeAuthenticationError extends Schema.TaggedError<BridgeAuthenticationError>()(
  "BridgeAuthenticationError",
  { reason: Schema.Literals(["secret-not-configured", "missing-token", "invalid-token"]) },
) {}

export const WorkspaceErrorSchema = Schema.Union([
  WorkspacePathError,
  ObjectKeyError,
  WorkspaceNotFoundError,
  FileRecordNotFoundError,
  StorageObjectNotFoundError,
  ExecutionNotFoundError,
  InvalidStateTransitionError,
  InvalidExecutionStreamError,
  WorkspaceConflictError,
  WorkspaceRuntimeError,
]);

export type WorkspaceError = typeof WorkspaceErrorSchema.Type;
