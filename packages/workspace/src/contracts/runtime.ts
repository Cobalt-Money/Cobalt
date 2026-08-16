import { Context } from "effect";
import type { Effect, Stream } from "effect";
import type {
  ExecutionNotFoundError,
  InvalidExecutionStreamError,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  WorkspacePathError,
  WorkspaceRuntimeError,
} from "../domain/errors.js";
import type {
  CommandRequest,
  ExecutionEvent,
  FileEntry,
  ExecutionIdSchema,
  WorkspaceRecord,
  WorkspaceScope,
} from "../domain/schemas.js";

export type WorkspaceRuntimeFailure =
  | WorkspaceConflictError
  | WorkspaceNotFoundError
  | WorkspacePathError
  | WorkspaceRuntimeError;

export type WorkspaceExecutionFailure =
  | ExecutionNotFoundError
  | InvalidExecutionStreamError
  | WorkspaceNotFoundError
  | WorkspaceRuntimeError;

export class WorkspaceRuntime extends Context.Service<
  WorkspaceRuntime,
  {
    readonly create: (
      scope: WorkspaceScope,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceRuntimeFailure>;
    readonly wake: (
      scope: WorkspaceScope,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceRuntimeFailure>;
    readonly stop: (
      scope: WorkspaceScope,
    ) => Effect.Effect<WorkspaceRecord, WorkspaceRuntimeFailure>;
    readonly execute: (
      request: CommandRequest,
    ) => Stream.Stream<ExecutionEvent, WorkspaceExecutionFailure>;
    readonly cancel: (
      scope: WorkspaceScope,
      executionId: typeof ExecutionIdSchema.Type,
    ) => Effect.Effect<
      void,
      ExecutionNotFoundError | WorkspaceNotFoundError | WorkspaceRuntimeError
    >;
    readonly readFile: (
      scope: WorkspaceScope,
      path: string,
    ) => Stream.Stream<
      Uint8Array,
      WorkspaceNotFoundError | WorkspacePathError | WorkspaceRuntimeError
    >;
    readonly writeFile: (
      scope: WorkspaceScope,
      path: string,
      bytes: Stream.Stream<Uint8Array, WorkspaceRuntimeError>,
    ) => Effect.Effect<
      FileEntry,
      WorkspaceNotFoundError | WorkspacePathError | WorkspaceRuntimeError
    >;
    readonly listFiles: (
      scope: WorkspaceScope,
      path: string,
    ) => Effect.Effect<
      readonly FileEntry[],
      WorkspaceNotFoundError | WorkspacePathError | WorkspaceRuntimeError
    >;
  }
>()("@cobalt-web/workspace/WorkspaceRuntime") {}
