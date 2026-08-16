import { Schema } from "effect";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const environmentNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 31 || code === 127) {
      return true;
    }
  }
  return false;
};

const isCanonicalWorkspacePath = (value: string): boolean => {
  if (
    !value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("//") ||
    hasControlCharacter(value)
  ) {
    return false;
  }
  const segments = value.slice(1).split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return false;
  }
  return (
    segments[0] === "workspace" ||
    (segments[0] === "mnt" && (segments[1] === "uploads" || segments[1] === "outputs"))
  );
};

export const UuidSchema = Schema.String.check(
  Schema.isPattern(uuidPattern, { message: "Expected a UUID" }),
);
export const UserIdSchema = Schema.NonEmptyString;
export const WorkspaceIdSchema = UuidSchema;
export const FileIdSchema = UuidSchema;
export const ExecutionIdSchema = UuidSchema;
export const RequestIdSchema = UuidSchema;
export const IsoTimestampSchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/),
);
export const CanonicalWorkspacePathSchema = Schema.String.check(
  Schema.makeFilter<string>(isCanonicalWorkspacePath, {
    message: "Expected a canonical mounted workspace path",
  }),
);
export const IdempotencyKeySchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200),
);
export const EnvironmentVariableNameSchema = Schema.String.check(
  Schema.isPattern(environmentNamePattern),
);
const EnvironmentSchema = Schema.Record(Schema.String, Schema.String).check(
  Schema.makeFilter<Readonly<Record<string, string>>>(
    (value) => Object.keys(value).every((key) => environmentNamePattern.test(key)),
    { message: "Environment variable names must be portable identifiers" },
  ),
);

export const WorkspaceScopeSchema = Schema.Struct({
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type WorkspaceScope = typeof WorkspaceScopeSchema.Type;

export const WorkspaceStateSchema = Schema.Literals([
  "created",
  "starting",
  "running",
  "stopping",
  "stopped",
  "failed",
  "deleted",
]);
export type WorkspaceState = typeof WorkspaceStateSchema.Type;

export const WorkspaceRecordSchema = Schema.Struct({
  createdAt: IsoTimestampSchema,
  state: WorkspaceStateSchema,
  updatedAt: IsoTimestampSchema,
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type WorkspaceRecord = typeof WorkspaceRecordSchema.Type;

export const CreateWorkspaceRecordSchema = Schema.Struct({
  state: WorkspaceStateSchema,
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type CreateWorkspaceRecord = typeof CreateWorkspaceRecordSchema.Type;

export const CommandRequestSchema = Schema.Struct({
  argv: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
  cwd: CanonicalWorkspacePathSchema,
  env: EnvironmentSchema,
  executionId: ExecutionIdSchema,
  idempotencyKey: IdempotencyKeySchema,
  timeoutMs: Schema.Int.check(Schema.isBetween({ maximum: 3_600_000, minimum: 1 })),
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type CommandRequest = typeof CommandRequestSchema.Type;

const EventFields = {
  executionId: ExecutionIdSchema,
  sequence: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  timestamp: IsoTimestampSchema,
};
export const ExecutionStartedSchema = Schema.TaggedStruct("ExecutionStarted", EventFields);
export const ExecutionStdoutSchema = Schema.TaggedStruct("ExecutionStdout", {
  ...EventFields,
  data: Schema.String,
});
export const ExecutionStderrSchema = Schema.TaggedStruct("ExecutionStderr", {
  ...EventFields,
  data: Schema.String,
});
export const ExecutionCompletedSchema = Schema.TaggedStruct("ExecutionCompleted", {
  ...EventFields,
  exitCode: Schema.Int,
});
export const ExecutionTimedOutSchema = Schema.TaggedStruct("ExecutionTimedOut", EventFields);
export const ExecutionCancelledSchema = Schema.TaggedStruct("ExecutionCancelled", EventFields);
export const ExecutionFailedSchema = Schema.TaggedStruct("ExecutionFailed", {
  ...EventFields,
  reason: Schema.String,
});
export const ExecutionEventSchema = Schema.Union([
  ExecutionStartedSchema,
  ExecutionStdoutSchema,
  ExecutionStderrSchema,
  ExecutionCompletedSchema,
  ExecutionTimedOutSchema,
  ExecutionCancelledSchema,
  ExecutionFailedSchema,
]);
export type ExecutionEvent = typeof ExecutionEventSchema.Type;

export const FileKindSchema = Schema.Literals(["upload", "artifact"]);
export type FileKind = typeof FileKindSchema.Type;
export const FileStateSchema = Schema.Literals(["pending", "ready", "failed", "deleted"]);
export type FileState = typeof FileStateSchema.Type;
export const ObjectKeyKindSchema = Schema.Literals(["uploads", "outputs"]);
export type ObjectKeyKind = typeof ObjectKeyKindSchema.Type;

export const FileRecordSchema = Schema.Struct({
  checksum: Schema.NonEmptyString,
  contentType: Schema.NonEmptyString,
  createdAt: IsoTimestampSchema,
  fileId: FileIdSchema,
  idempotencyKey: Schema.optional(IdempotencyKeySchema),
  kind: FileKindSchema,
  name: Schema.NonEmptyString,
  objectKey: Schema.NonEmptyString,
  path: CanonicalWorkspacePathSchema,
  size: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  state: FileStateSchema,
  updatedAt: IsoTimestampSchema,
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type FileRecord = typeof FileRecordSchema.Type;

export const PublishedArtifactSchema = Schema.Struct({
  checksum: Schema.NonEmptyString,
  contentType: Schema.NonEmptyString,
  fileId: FileIdSchema,
  name: Schema.NonEmptyString,
  path: CanonicalWorkspacePathSchema,
  size: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
});
export type PublishedArtifact = typeof PublishedArtifactSchema.Type;

export const FileEntrySchema = Schema.Struct({
  path: CanonicalWorkspacePathSchema,
  size: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  type: Schema.Literals(["file", "directory"]),
});
export type FileEntry = typeof FileEntrySchema.Type;

export const StorageObjectMetadataSchema = Schema.Struct({
  checksum: Schema.NonEmptyString,
  contentType: Schema.NonEmptyString,
  size: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});
export type StorageObjectMetadata = typeof StorageObjectMetadataSchema.Type;

const BridgeEnvelopeFields = {
  requestId: RequestIdSchema,
  scope: WorkspaceScopeSchema,
  version: Schema.Literal(1),
};
export const BridgeRequestSchema = Schema.Union([
  Schema.TaggedStruct("CreateWorkspace", BridgeEnvelopeFields),
  Schema.TaggedStruct("WakeWorkspace", BridgeEnvelopeFields),
  Schema.TaggedStruct("StopWorkspace", BridgeEnvelopeFields),
  Schema.TaggedStruct("ExecuteCommand", { ...BridgeEnvelopeFields, command: CommandRequestSchema }),
  Schema.TaggedStruct("CancelExecution", {
    ...BridgeEnvelopeFields,
    executionId: ExecutionIdSchema,
  }),
  Schema.TaggedStruct("ReadFile", { ...BridgeEnvelopeFields, path: CanonicalWorkspacePathSchema }),
  Schema.TaggedStruct("WriteFile", {
    ...BridgeEnvelopeFields,
    metadata: StorageObjectMetadataSchema,
    path: CanonicalWorkspacePathSchema,
  }),
  Schema.TaggedStruct("ListFiles", { ...BridgeEnvelopeFields, path: CanonicalWorkspacePathSchema }),
]);
export type BridgeRequest = typeof BridgeRequestSchema.Type;

export const BridgeErrorSchema = Schema.Struct({
  code: Schema.Literals([
    "UNAUTHENTICATED",
    "INVALID_REQUEST",
    "NOT_FOUND",
    "CONFLICT",
    "FORBIDDEN",
    "TIMEOUT",
    "UNAVAILABLE",
    "INTERNAL",
  ]),
  message: Schema.String,
  retryable: Schema.Boolean,
});
export type BridgeError = typeof BridgeErrorSchema.Type;

export const BridgeResponseSchema = Schema.Union([
  Schema.TaggedStruct("BridgeSuccess", {
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("BridgeFailure", {
    error: BridgeErrorSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("WorkspaceResult", {
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
    workspace: WorkspaceRecordSchema,
  }),
  Schema.TaggedStruct("ExecutionAccepted", {
    executionId: ExecutionIdSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("ExecutionCancelledResult", {
    executionId: ExecutionIdSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("FileReadResult", {
    metadata: StorageObjectMetadataSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("FileWriteResult", {
    file: FileEntrySchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("FileListResult", {
    files: Schema.Array(FileEntrySchema),
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
]);
export type BridgeResponse = typeof BridgeResponseSchema.Type;

export const BridgeStreamMessageSchema = Schema.Union([
  Schema.TaggedStruct("ExecutionEventMessage", {
    event: ExecutionEventSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
  Schema.TaggedStruct("ExecutionErrorMessage", {
    error: BridgeErrorSchema,
    requestId: RequestIdSchema,
    version: Schema.Literal(1),
  }),
]);
export type BridgeStreamMessage = typeof BridgeStreamMessageSchema.Type;

export const WorkspaceScopeStandardSchema = Schema.toStandardSchemaV1(WorkspaceScopeSchema);
export const CommandRequestStandardSchema = Schema.toStandardSchemaV1(CommandRequestSchema);
