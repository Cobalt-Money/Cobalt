import { Context } from "effect";
import type { Effect, Stream } from "effect";
import type {
  ObjectKeyError,
  StorageObjectNotFoundError,
  WorkspaceRuntimeError,
} from "../domain/errors.js";
import type { StorageObjectMetadata, WorkspaceScope } from "../domain/schemas.js";

export type ObjectStorageFailure =
  | ObjectKeyError
  | StorageObjectNotFoundError
  | WorkspaceRuntimeError;

export class WorkspaceObjectStorage extends Context.Service<
  WorkspaceObjectStorage,
  {
    readonly put: (
      scope: WorkspaceScope,
      key: string,
      bytes: Stream.Stream<Uint8Array, WorkspaceRuntimeError>,
      metadata: StorageObjectMetadata,
    ) => Effect.Effect<StorageObjectMetadata, ObjectKeyError | WorkspaceRuntimeError>;
    readonly head: (
      scope: WorkspaceScope,
      key: string,
    ) => Effect.Effect<StorageObjectMetadata, ObjectKeyError | StorageObjectNotFoundError>;
    readonly read: (
      scope: WorkspaceScope,
      key: string,
    ) => Stream.Stream<Uint8Array, ObjectKeyError | StorageObjectNotFoundError>;
    readonly delete: (
      scope: WorkspaceScope,
      key: string,
    ) => Effect.Effect<void, ObjectKeyError | StorageObjectNotFoundError>;
  }
>()("@cobalt-web/workspace/WorkspaceObjectStorage") {}
