import { Effect, Encoding, Result, Schema } from "effect";
import { ObjectKeyError, WorkspacePathError } from "../domain/errors.js";
import { CanonicalWorkspacePathSchema, UuidSchema } from "../domain/schemas.js";
import type { FileIdSchema, ObjectKeyKind, WorkspaceScope } from "../domain/schemas.js";

export type WorkspacePathOperation = "read" | "write" | "list";
export type WorkspaceMount = "uploads" | "outputs" | "workspace";

export interface CanonicalWorkspacePath {
  readonly mount: WorkspaceMount;
  readonly path: string;
  readonly writable: boolean;
}

const mountForPath = (path: string): WorkspaceMount => {
  if (path === "/mnt/uploads" || path.startsWith("/mnt/uploads/")) {
    return "uploads";
  }
  if (path === "/mnt/outputs" || path.startsWith("/mnt/outputs/")) {
    return "outputs";
  }
  return "workspace";
};

export const parseWorkspacePath = (
  path: string,
  operation: WorkspacePathOperation,
): Effect.Effect<CanonicalWorkspacePath, WorkspacePathError> =>
  Effect.gen(function* parseWorkspacePathEffect() {
    const parsed = yield* Schema.decodeUnknownEffect(CanonicalWorkspacePathSchema)(path).pipe(
      Effect.mapError(
        () =>
          new WorkspacePathError({
            operation,
            path,
            reason: "Path is not canonical or is outside a mount",
          }),
      ),
    );
    const mount = mountForPath(parsed);
    if (operation === "write" && mount === "uploads") {
      return yield* new WorkspacePathError({ operation, path, reason: "Uploads are read-only" });
    }
    return { mount, path: parsed, writable: mount !== "uploads" };
  });

export interface ParsedObjectKey {
  readonly scope: WorkspaceScope;
  readonly kind: ObjectKeyKind;
  readonly fileId: typeof FileIdSchema.Type;
  readonly key: string;
}

export const makeObjectKey = (
  scope: WorkspaceScope,
  kind: ObjectKeyKind,
  fileId: typeof FileIdSchema.Type,
): string =>
  `users/${Encoding.encodeBase64Url(scope.userId)}/workspaces/${scope.workspaceId}/${kind}/${fileId}`;

export const parseObjectKey = (
  key: string,
  expectedScope: WorkspaceScope,
): Effect.Effect<ParsedObjectKey, ObjectKeyError> =>
  Effect.gen(function* parseObjectKeyEffect() {
    const hasControlCharacter = [...key].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 31 || code === 127;
    });
    if (key.includes("\\") || key.includes("//") || hasControlCharacter) {
      return yield* new ObjectKeyError({ key, reason: "Object key is not canonical" });
    }
    const match = /^users\/([A-Za-z0-9_-]+)\/workspaces\/([^/]+)\/(uploads|outputs)\/([^/]+)$/.exec(
      key,
    );
    if (!match) {
      return yield* new ObjectKeyError({ key, reason: "Object key has an invalid shape" });
    }
    const [, encodedUserId, workspaceId, kind, fileId] = match;
    const decoded = Encoding.decodeBase64UrlString(encodedUserId ?? "");
    if (Result.isFailure(decoded)) {
      return yield* new ObjectKeyError({ key, reason: "Object key user is not valid base64url" });
    }
    const parsedWorkspaceId = Schema.decodeUnknownOption(UuidSchema)(workspaceId);
    const parsedFileId = Schema.decodeUnknownOption(UuidSchema)(fileId);
    if (parsedWorkspaceId._tag === "None" || parsedFileId._tag === "None") {
      return yield* new ObjectKeyError({
        key,
        reason: "Object key contains an invalid identifier",
      });
    }
    if (decoded.success !== expectedScope.userId || workspaceId !== expectedScope.workspaceId) {
      return yield* new ObjectKeyError({ key, reason: "Object key is outside the expected scope" });
    }
    return {
      fileId: fileId as typeof FileIdSchema.Type,
      key,
      kind: kind as ObjectKeyKind,
      scope: expectedScope,
    };
  });
