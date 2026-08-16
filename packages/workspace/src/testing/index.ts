import type { Context } from "effect";
import { Effect, Layer, Stream } from "effect";
import {
  FileRecordNotFoundError,
  ExecutionNotFoundError,
  InvalidExecutionStreamError,
  InvalidStateTransitionError,
  StorageObjectNotFoundError,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  WorkspaceRuntimeError,
} from "../domain/errors.js";
import { WorkspaceMetadataStore } from "../contracts/metadata.js";
import { WorkspaceRuntime } from "../contracts/runtime.js";
import { WorkspaceObjectStorage } from "../contracts/storage.js";
import type {
  CommandRequest,
  ExecutionEvent,
  FileRecord,
  FileState,
  StorageObjectMetadata,
  WorkspaceRecord,
  WorkspaceScope,
  WorkspaceState,
} from "../domain/schemas.js";
import { makeObjectKey, parseObjectKey, parseWorkspacePath } from "../paths/index.js";

// oxlint-disable prefer-spread -- Uint8Array.slice preserves byte-stream chunk types and defensive copies.

export const UUIDS = {
  execution: "00000000-0000-4000-8000-000000000005",
  file: "00000000-0000-4000-8000-000000000003",
  otherFile: "00000000-0000-4000-8000-000000000004",
  otherWorkspace: "00000000-0000-4000-8000-000000000002",
  request: "00000000-0000-4000-8000-000000000006",
  workspace: "00000000-0000-4000-8000-000000000001",
} as const;

const FIXED_TIME = "2026-01-01T00:00:00.000Z";

export const scope = (overrides: Partial<WorkspaceScope> = {}): WorkspaceScope => ({
  userId: "user-1",
  workspaceId: UUIDS.workspace,
  ...overrides,
});

export const command = (overrides: Partial<CommandRequest> = {}): CommandRequest => ({
  argv: ["printf", "hello"],
  cwd: "/workspace",
  env: {},
  executionId: UUIDS.execution,
  idempotencyKey: "execution-key",
  timeoutMs: 30_000,
  ...scope(),
  ...overrides,
});

const baseEvent = (sequence: number) => ({
  executionId: UUIDS.execution,
  sequence,
  timestamp: FIXED_TIME,
});

export const event = {
  cancelled: (sequence = 2): ExecutionEvent => ({
    _tag: "ExecutionCancelled",
    ...baseEvent(sequence),
  }),
  completed: (exitCode: number, sequence = 2): ExecutionEvent => ({
    _tag: "ExecutionCompleted",
    ...baseEvent(sequence),
    exitCode,
  }),
  failed: (reason: string, sequence = 2): ExecutionEvent => ({
    _tag: "ExecutionFailed",
    ...baseEvent(sequence),
    reason,
  }),
  started: (sequence = 0): ExecutionEvent => ({ _tag: "ExecutionStarted", ...baseEvent(sequence) }),
  stderr: (data: string, sequence = 1): ExecutionEvent => ({
    _tag: "ExecutionStderr",
    ...baseEvent(sequence),
    data,
  }),
  stdout: (data: string, sequence = 1): ExecutionEvent => ({
    _tag: "ExecutionStdout",
    ...baseEvent(sequence),
    data,
  }),
  timedOut: (sequence = 2): ExecutionEvent => ({
    _tag: "ExecutionTimedOut",
    ...baseEvent(sequence),
  }),
};

export const fileRecord = (overrides: Partial<FileRecord> = {}): FileRecord => {
  const expectedScope = scope();
  return {
    ...expectedScope,
    checksum: "sha256:test",
    contentType: "text/plain",
    createdAt: FIXED_TIME,
    fileId: UUIDS.file,
    idempotencyKey: "file-key",
    kind: "upload",
    name: "input.txt",
    objectKey: makeObjectKey(expectedScope, "uploads", UUIDS.file),
    path: "/mnt/uploads/input.txt",
    size: 3,
    state: "ready",
    updatedAt: FIXED_TIME,
    ...overrides,
  };
};

const scopeKey = (value: WorkspaceScope): string => `${value.userId}\u0000${value.workspaceId}`;
const fileKey = (value: WorkspaceScope, fileId: string): string =>
  `${scopeKey(value)}\u0000${fileId}`;
const now = (): string => new Date().toISOString();

const workspaceRecord = (value: WorkspaceScope, state: WorkspaceState): WorkspaceRecord => {
  const timestamp = now();
  return { ...value, createdAt: timestamp, state, updatedAt: timestamp };
};

const combineBytes = (chunks: readonly Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
};

const terminalTags = new Set<ExecutionEvent["_tag"]>([
  "ExecutionCompleted",
  "ExecutionTimedOut",
  "ExecutionCancelled",
  "ExecutionFailed",
]);

export interface InMemoryRuntimeOptions {
  readonly execution?: (
    request: CommandRequest,
  ) => Stream.Stream<ExecutionEvent, WorkspaceRuntimeError>;
}

export interface InMemoryRuntimeInspection {
  readonly cancelledExecutionIds: readonly string[];
  readonly workspaces: readonly WorkspaceRecord[];
}

export type InMemoryWorkspaceRuntime = Context.Service.Shape<typeof WorkspaceRuntime> & {
  readonly inspect: () => InMemoryRuntimeInspection;
};

export const makeInMemoryWorkspaceRuntime = (
  options: InMemoryRuntimeOptions = {},
): InMemoryWorkspaceRuntime => {
  const workspaces = new Map<string, WorkspaceRecord>();
  const files = new Map<string, Uint8Array>();
  const knownExecutions = new Set<string>();
  const activeExecutions = new Set<string>();
  const cancelledExecutionIds: string[] = [];

  const requireWorkspace = (
    value: WorkspaceScope,
  ): Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError> => {
    const record = workspaces.get(scopeKey(value));
    return record ? Effect.succeed(record) : Effect.fail(new WorkspaceNotFoundError(value));
  };

  const transition = (
    value: WorkspaceScope,
    state: WorkspaceState,
  ): Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError> =>
    requireWorkspace(value).pipe(
      Effect.map((record) => {
        const next = { ...record, state, updatedAt: now() };
        workspaces.set(scopeKey(value), next);
        return next;
      }),
    );

  const cancel = (
    value: WorkspaceScope,
    executionId: string,
  ): Effect.Effect<void, ExecutionNotFoundError | WorkspaceNotFoundError> =>
    requireWorkspace(value).pipe(
      Effect.flatMap(() =>
        knownExecutions.has(executionId)
          ? Effect.sync(() => {
              activeExecutions.delete(executionId);
              if (!cancelledExecutionIds.includes(executionId)) {
                cancelledExecutionIds.push(executionId);
              }
            })
          : Effect.fail(new ExecutionNotFoundError({ ...value, executionId })),
      ),
    );

  return {
    cancel,
    create: (value) =>
      Effect.suspend(() => {
        const key = scopeKey(value);
        if (workspaces.has(key)) {
          return Effect.fail(
            new WorkspaceConflictError({ reason: "Workspace already exists", resource: key }),
          );
        }
        const record = workspaceRecord(value, "created");
        workspaces.set(key, record);
        return Effect.succeed(record);
      }),
    execute: (request) => {
      const requestedScope = { userId: request.userId, workspaceId: request.workspaceId };
      if (!workspaces.has(scopeKey(requestedScope))) {
        return Stream.fail(new WorkspaceNotFoundError(requestedScope));
      }
      knownExecutions.add(request.executionId);
      activeExecutions.add(request.executionId);
      let expectedSequence = 0;
      let terminalCount = 0;
      const source =
        options.execution?.(request) ??
        Stream.fromIterable([event.started(), event.completed(0, 1)]);
      const validated = source.pipe(
        Stream.mapEffect((value) => {
          if (value.executionId !== request.executionId || value.sequence !== expectedSequence) {
            return Effect.fail(
              new InvalidExecutionStreamError({
                executionId: request.executionId,
                reason: "Execution IDs must match and sequence numbers must be contiguous",
              }),
            );
          }
          expectedSequence += 1;
          if (terminalTags.has(value._tag)) {
            terminalCount += 1;
            activeExecutions.delete(request.executionId);
          } else if (terminalCount > 0) {
            return Effect.fail(
              new InvalidExecutionStreamError({
                executionId: request.executionId,
                reason: "No events may follow a terminal event",
              }),
            );
          }
          if (terminalCount > 1) {
            return Effect.fail(
              new InvalidExecutionStreamError({
                executionId: request.executionId,
                reason: "An execution must have exactly one terminal event",
              }),
            );
          }
          return Effect.succeed(value);
        }),
      );
      const verifyTerminal = Effect.suspend(() =>
        terminalCount === 1
          ? Effect.void
          : Effect.fail(
              new InvalidExecutionStreamError({
                executionId: request.executionId,
                reason: "An execution must have exactly one terminal event",
              }),
            ),
      );
      return Stream.concat(validated, Stream.fromEffectDrain(verifyTerminal)).pipe(
        Stream.ensuring(
          Effect.sync(() => {
            if (activeExecutions.delete(request.executionId)) {
              cancelledExecutionIds.push(request.executionId);
            }
          }),
        ),
      );
    },
    inspect: () => ({
      cancelledExecutionIds: [...cancelledExecutionIds],
      workspaces: [...workspaces.values()].map((record) => ({ ...record })),
    }),
    listFiles: (value, path) =>
      Effect.gen(function* listFiles() {
        yield* requireWorkspace(value);
        const parsed = yield* parseWorkspacePath(path, "list");
        const prefix = parsed.path.endsWith("/") ? parsed.path : `${parsed.path}/`;
        return [...files.entries()]
          .filter(([key]) => key.startsWith(`${scopeKey(value)}\u0000${prefix}`))
          .map(([key, bytes]) => ({
            path: key.slice(scopeKey(value).length + 1),
            size: bytes.byteLength,
            type: "file" as const,
          }));
      }),
    readFile: (value, path) =>
      Stream.unwrap(
        Effect.gen(function* readFile() {
          yield* requireWorkspace(value);
          const parsed = yield* parseWorkspacePath(path, "read");
          const bytes = files.get(`${scopeKey(value)}\u0000${parsed.path}`);
          if (!bytes) {
            return yield* new WorkspaceRuntimeError({
              operation: "readFile",
              reason: "File not found",
            });
          }
          return Stream.make(bytes.slice());
        }),
      ),
    stop: (value) => transition(value, "stopped"),
    wake: (value) => transition(value, "running"),
    writeFile: (value, path, bytes) =>
      Effect.gen(function* writeFile() {
        yield* requireWorkspace(value);
        const parsed = yield* parseWorkspacePath(path, "write");
        const chunks = yield* Stream.runCollect(bytes);
        const combined = combineBytes(chunks);
        files.set(`${scopeKey(value)}\u0000${parsed.path}`, combined.slice());
        return { path: parsed.path, size: combined.byteLength, type: "file" as const };
      }),
  };
};

export const inMemoryWorkspaceRuntimeLayer = (
  options: InMemoryRuntimeOptions = {},
): Layer.Layer<WorkspaceRuntime> =>
  Layer.sync(WorkspaceRuntime, () => makeInMemoryWorkspaceRuntime(options));

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

export const makeInMemoryMetadataStore = (): Context.Service.Shape<
  typeof WorkspaceMetadataStore
> => {
  const workspaces = new Map<string, WorkspaceRecord>();
  const files = new Map<string, FileRecord>();
  const idempotency = new Map<string, string>();

  const getWorkspace = (
    value: WorkspaceScope,
  ): Effect.Effect<WorkspaceRecord, WorkspaceNotFoundError> => {
    const record = workspaces.get(scopeKey(value));
    return record ? Effect.succeed({ ...record }) : Effect.fail(new WorkspaceNotFoundError(value));
  };
  const getFile = (
    value: WorkspaceScope,
    fileId: string,
  ): Effect.Effect<FileRecord, FileRecordNotFoundError> => {
    const record = files.get(fileKey(value, fileId));
    return record
      ? Effect.succeed({ ...record })
      : Effect.fail(new FileRecordNotFoundError({ ...value, fileId }));
  };

  return {
    createFile: (record) =>
      Effect.suspend(() => {
        const idempotencyKey = record.idempotencyKey
          ? `${scopeKey(record)}\u0000${record.idempotencyKey}`
          : undefined;
        const existingId = idempotencyKey ? idempotency.get(idempotencyKey) : undefined;
        if (existingId) {
          const existing = files.get(fileKey(record, existingId));
          if (existing) {
            return Effect.succeed({ ...existing });
          }
        }
        const key = fileKey(record, record.fileId);
        if (files.has(key)) {
          return Effect.fail(
            new WorkspaceConflictError({ reason: "File already exists", resource: key }),
          );
        }
        files.set(key, { ...record });
        if (idempotencyKey) {
          idempotency.set(idempotencyKey, record.fileId);
        }
        return Effect.succeed({ ...record });
      }),
    createWorkspace: (record) =>
      Effect.suspend(() => {
        const key = scopeKey(record);
        if (workspaces.has(key)) {
          return Effect.fail(
            new WorkspaceConflictError({ reason: "Workspace already exists", resource: key }),
          );
        }
        const created = workspaceRecord(record, record.state);
        workspaces.set(key, created);
        return Effect.succeed({ ...created });
      }),
    deleteFile: (value, fileId) =>
      getFile(value, fileId).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            files.delete(fileKey(value, fileId));
          }),
        ),
        Effect.asVoid,
      ),
    deleteWorkspace: (value) =>
      getWorkspace(value).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            workspaces.delete(scopeKey(value));
            for (const key of files.keys()) {
              if (key.startsWith(`${scopeKey(value)}\u0000`)) {
                files.delete(key);
              }
            }
          }),
        ),
        Effect.asVoid,
      ),
    getFile,
    getWorkspace,
    listFiles: (value) =>
      Effect.sync(() =>
        [...files.values()].filter(
          (record) => record.userId === value.userId && record.workspaceId === value.workspaceId,
        ),
      ),
    listWorkspaces: (userId) =>
      Effect.sync(() => [...workspaces.values()].filter((record) => record.userId === userId)),
    transitionFile: (value, fileId, state) =>
      getFile(value, fileId).pipe(
        Effect.flatMap((record) => {
          if (!fileTransitions[record.state].includes(state)) {
            return Effect.fail(
              new InvalidStateTransitionError({ entity: "file", from: record.state, to: state }),
            );
          }
          const updated = { ...record, state, updatedAt: now() };
          files.set(fileKey(value, fileId), updated);
          return Effect.succeed(updated);
        }),
      ),
    transitionWorkspace: (value, state) =>
      getWorkspace(value).pipe(
        Effect.flatMap((record) => {
          if (!workspaceTransitions[record.state].includes(state)) {
            return Effect.fail(
              new InvalidStateTransitionError({
                entity: "workspace",
                from: record.state,
                to: state,
              }),
            );
          }
          const updated = { ...record, state, updatedAt: now() };
          workspaces.set(scopeKey(value), updated);
          return Effect.succeed(updated);
        }),
      ),
  };
};

export const inMemoryMetadataStoreLayer = (): Layer.Layer<WorkspaceMetadataStore> =>
  Layer.sync(WorkspaceMetadataStore, makeInMemoryMetadataStore);

interface StoredObject {
  readonly bytes: Uint8Array;
  readonly metadata: StorageObjectMetadata;
}

export const makeInMemoryObjectStorage = (): Context.Service.Shape<
  typeof WorkspaceObjectStorage
> => {
  const objects = new Map<string, StoredObject>();
  const authorize = (value: WorkspaceScope, key: string) => parseObjectKey(key, value);
  return {
    delete: (value, key) =>
      authorize(value, key).pipe(
        Effect.flatMap(() =>
          objects.delete(key) ? Effect.void : Effect.fail(new StorageObjectNotFoundError({ key })),
        ),
      ),
    head: (value, key) =>
      authorize(value, key).pipe(
        Effect.flatMap(() => {
          const stored = objects.get(key);
          return stored
            ? Effect.succeed({ ...stored.metadata })
            : Effect.fail(new StorageObjectNotFoundError({ key }));
        }),
      ),
    put: (value, key, bytes, metadata) =>
      Effect.gen(function* put() {
        yield* authorize(value, key);
        const chunks = yield* Stream.runCollect(bytes);
        const combined = combineBytes(chunks);
        if (combined.byteLength !== metadata.size) {
          return yield* new WorkspaceRuntimeError({
            operation: "objectStorage.put",
            reason: "Byte length does not match metadata size",
          });
        }
        objects.set(key, { bytes: combined.slice(), metadata: { ...metadata } });
        return { ...metadata };
      }),
    read: (value, key) =>
      Stream.unwrap(
        authorize(value, key).pipe(
          Effect.flatMap(() => {
            const stored = objects.get(key);
            return stored
              ? Effect.succeed(Stream.make(stored.bytes.slice()))
              : Effect.fail(new StorageObjectNotFoundError({ key }));
          }),
        ),
      ),
  };
};

export const inMemoryObjectStorageLayer = (): Layer.Layer<WorkspaceObjectStorage> =>
  Layer.sync(WorkspaceObjectStorage, makeInMemoryObjectStorage);

export const artifact = (overrides: Partial<FileRecord> = {}): FileRecord =>
  fileRecord({
    fileId: UUIDS.otherFile,
    idempotencyKey: "artifact-key",
    kind: "artifact",
    name: "report.csv",
    objectKey: makeObjectKey(scope(), "outputs", UUIDS.otherFile),
    path: "/mnt/outputs/report.csv",
    ...overrides,
  });

export const bridgeRequest = () => ({
  _tag: "WakeWorkspace" as const,
  requestId: UUIDS.request,
  scope: scope(),
  version: 1 as const,
});
