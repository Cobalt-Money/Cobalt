import { createHash } from "node:crypto";
import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import type {
  ConfirmUpload,
  FileRecord,
  InitializeUpload,
  StorageObjectMetadata,
  WorkspaceFile,
} from "./schemas.js";
import { toWorkspaceFile } from "./schemas.js";
import { isStorageObjectNotFound, toMetadataApiError, toStorageApiError } from "./errors.js";

export interface WorkspaceFilesMetadataAdapter {
  readonly createFile: (record: FileRecord) => Promise<FileRecord>;
  readonly deleteFile: (userId: string, workspaceId: string, fileId: string) => Promise<void>;
  readonly getFile: (userId: string, workspaceId: string, fileId: string) => Promise<FileRecord>;
  readonly getWorkspace: (userId: string, workspaceId: string) => Promise<void>;
  readonly listFiles: (userId: string, workspaceId: string) => Promise<readonly FileRecord[]>;
  readonly transitionFile: (
    userId: string,
    workspaceId: string,
    fileId: string,
    state: FileRecord["state"],
  ) => Promise<FileRecord>;
}

export interface WorkspaceFilesObjectStorageAdapter {
  readonly delete: (userId: string, workspaceId: string, objectKey: string) => Promise<void>;
  readonly head: (
    userId: string,
    workspaceId: string,
    objectKey: string,
  ) => Promise<StorageObjectMetadata>;
  readonly put: (
    userId: string,
    workspaceId: string,
    objectKey: string,
    bytes: Uint8Array,
    metadata: StorageObjectMetadata,
  ) => Promise<void>;
  readonly read: (userId: string, workspaceId: string, objectKey: string) => Promise<Uint8Array>;
}

export interface DirectUploadRequest extends StorageObjectMetadata {
  readonly fileId: string;
  readonly fileName: string;
  readonly objectKey: string;
  readonly userId: string;
  readonly workspaceId: string;
}
export interface DirectUploadTarget {
  readonly headers?: Readonly<Record<string, string>>;
  readonly method: "PUT";
  readonly url: string;
}
export interface WorkspaceFilesDependencies {
  readonly createDirectUpload?: (request: DirectUploadRequest) => Promise<DirectUploadTarget>;
  readonly metadata: WorkspaceFilesMetadataAdapter;
  readonly storage: WorkspaceFilesObjectStorageAdapter;
}

const userToken = (userId: string): string => Buffer.from(userId).toString("base64url");
const makeObjectKey = (
  userId: string,
  workspaceId: string,
  fileId: string,
  kind: FileRecord["kind"] = "upload",
): string =>
  `users/${userToken(userId)}/workspaces/${workspaceId}/${kind === "upload" ? "uploads" : "outputs"}/${fileId}`;
const filePath = (name: string): string => `/mnt/uploads/${name}`;

export const assertObjectKey = (record: FileRecord, objectKey: string): void => {
  const expected = makeObjectKey(record.userId, record.workspaceId, record.fileId, record.kind);
  if (objectKey !== expected || objectKey !== record.objectKey) {
    throw new ApiError(400, "invalid_object_key", "Object key does not match the file");
  }
};

const assertFileIdentity = (
  record: FileRecord,
  userId: string,
  workspaceId: string,
  fileId?: string,
): void => {
  if (
    record.userId !== userId ||
    record.workspaceId !== workspaceId ||
    (fileId !== undefined && record.fileId !== fileId)
  ) {
    throw new ApiError(404, "file_not_found", "File not found");
  }
};

const requireWorkspace = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
): Promise<void> => {
  try {
    await deps.metadata.getWorkspace(userId, workspaceId);
  } catch (error) {
    throw toMetadataApiError(error);
  }
};
const getFile = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
): Promise<FileRecord> => {
  await requireWorkspace(deps, userId, workspaceId);
  try {
    const record = await deps.metadata.getFile(userId, workspaceId, fileId);
    assertFileIdentity(record, userId, workspaceId, fileId);
    return record;
  } catch (error) {
    throw toMetadataApiError(error);
  }
};

export const initializeUpload = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  input: InitializeUpload,
): Promise<{
  file: WorkspaceFile;
  upload: {
    headers: Record<string, string>;
    method: "PUT";
    mode: "direct" | "proxy";
    objectKey: string;
    url: string;
  };
}> => {
  await requireWorkspace(deps, userId, workspaceId);
  if (input.uploadMode === "direct" && !deps.createDirectUpload) {
    throw new ApiError(501, "direct_upload_unavailable", "Direct upload is unavailable");
  }
  const fileId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const candidate: FileRecord = {
    checksum: input.checksum,
    contentType: input.contentType,
    createdAt: timestamp,
    fileId,
    idempotencyKey: input.idempotencyKey,
    kind: "upload",
    name: input.fileName,
    objectKey: makeObjectKey(userId, workspaceId, fileId),
    path: filePath(input.fileName),
    size: input.size,
    state: "pending",
    updatedAt: timestamp,
    userId,
    workspaceId,
  };
  let record: FileRecord;
  try {
    record = await deps.metadata.createFile(candidate);
  } catch (error) {
    throw toMetadataApiError(error);
  }
  assertFileIdentity(record, userId, workspaceId);
  assertObjectKey(record, record.objectKey);
  if (
    record.name !== input.fileName ||
    record.contentType !== input.contentType ||
    record.size !== input.size ||
    record.checksum !== input.checksum
  ) {
    throw new ApiError(
      409,
      "idempotency_conflict",
      "Idempotency key belongs to a different upload",
    );
  }
  if (input.uploadMode === "direct") {
    try {
      const target = await deps.createDirectUpload?.({
        checksum: record.checksum,
        contentType: record.contentType,
        fileId: record.fileId,
        fileName: record.name,
        objectKey: record.objectKey,
        size: record.size,
        userId,
        workspaceId,
      });
      if (!target) {
        throw new ApiError(501, "direct_upload_unavailable", "Direct upload is unavailable");
      }
      return {
        file: toWorkspaceFile(record),
        upload: {
          headers: { ...target.headers },
          method: "PUT",
          mode: "direct",
          objectKey: record.objectKey,
          url: target.url,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(502, "upload_initialization_failed", "Could not initialize upload");
    }
  }
  return {
    file: toWorkspaceFile(record),
    upload: {
      headers: { "content-type": record.contentType },
      method: "PUT",
      mode: "proxy",
      objectKey: record.objectKey,
      url: `/${workspaceId}/uploads/${record.fileId}`,
    },
  };
};

export const uploadBytes = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
  contentType: string | undefined,
  bytes: Uint8Array,
): Promise<void> => {
  const record = await getFile(deps, userId, workspaceId, fileId);
  assertObjectKey(record, record.objectKey);
  if (record.state !== "pending") {
    throw new ApiError(409, "upload_already_confirmed", "Upload already confirmed");
  }
  if (contentType !== record.contentType || bytes.byteLength !== record.size) {
    throw new ApiError(
      400,
      "upload_metadata_mismatch",
      "Uploaded bytes do not match initialization",
    );
  }
  const checksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (checksum !== record.checksum) {
    throw new ApiError(
      400,
      "upload_checksum_mismatch",
      "Uploaded checksum does not match initialization",
    );
  }
  try {
    await deps.storage.put(userId, workspaceId, record.objectKey, bytes, {
      checksum,
      contentType: record.contentType,
      size: record.size,
    });
  } catch (error) {
    throw toStorageApiError(error);
  }
};

export const confirmUpload = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
  input: ConfirmUpload,
): Promise<WorkspaceFile> => {
  const record = await getFile(deps, userId, workspaceId, fileId);
  assertObjectKey(record, input.objectKey);
  if (record.state === "ready") {
    throw new ApiError(409, "upload_already_confirmed", "Upload already confirmed");
  }
  if (record.state !== "pending") {
    throw new ApiError(409, "invalid_file_state", "File is not awaiting upload");
  }
  let stored: StorageObjectMetadata;
  try {
    stored = await deps.storage.head(userId, workspaceId, record.objectKey);
  } catch (error) {
    if (isStorageObjectNotFound(error)) {
      throw new ApiError(409, "upload_missing", "Uploaded object not found");
    }
    throw toStorageApiError(error);
  }
  if (
    stored.checksum !== record.checksum ||
    stored.contentType !== record.contentType ||
    stored.size !== record.size
  ) {
    throw new ApiError(
      400,
      "upload_metadata_mismatch",
      "Uploaded object does not match initialization",
    );
  }
  try {
    return toWorkspaceFile(
      await deps.metadata.transitionFile(userId, workspaceId, fileId, "ready"),
    );
  } catch (error) {
    throw toMetadataApiError(error);
  }
};

export const listFiles = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
): Promise<readonly WorkspaceFile[]> => {
  await requireWorkspace(deps, userId, workspaceId);
  try {
    const files = await deps.metadata.listFiles(userId, workspaceId);
    for (const file of files) {
      assertFileIdentity(file, userId, workspaceId);
      assertObjectKey(file, file.objectKey);
    }
    return files.map(toWorkspaceFile).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    throw toMetadataApiError(error);
  }
};
export const readMetadata = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
): Promise<WorkspaceFile> => toWorkspaceFile(await getFile(deps, userId, workspaceId, fileId));
export const downloadFile = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
): Promise<{ bytes: Uint8Array; file: WorkspaceFile }> => {
  const record = await getFile(deps, userId, workspaceId, fileId);
  assertObjectKey(record, record.objectKey);
  if (record.state !== "ready") {
    throw new ApiError(409, "file_not_ready", "File is not ready");
  }
  try {
    return {
      bytes: await deps.storage.read(userId, workspaceId, record.objectKey),
      file: toWorkspaceFile(record),
    };
  } catch (error) {
    throw toStorageApiError(error);
  }
};
export const deleteFile = async (
  deps: WorkspaceFilesDependencies,
  userId: string,
  workspaceId: string,
  fileId: string,
): Promise<void> => {
  const record = await getFile(deps, userId, workspaceId, fileId);
  assertObjectKey(record, record.objectKey);
  try {
    await deps.storage.delete(userId, workspaceId, record.objectKey);
  } catch (error) {
    if (!isStorageObjectNotFound(error)) {
      throw toStorageApiError(error);
    }
  }
  try {
    await deps.metadata.deleteFile(userId, workspaceId, fileId);
  } catch (error) {
    throw toMetadataApiError(error);
  }
};
