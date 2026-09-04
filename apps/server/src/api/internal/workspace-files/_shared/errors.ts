import { ApiError } from "@cobalt-web/server-data/_shared/api-error";

const errorTag = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "_tag" in error
    ? String((error as { _tag: unknown })._tag)
    : undefined;

export const toMetadataApiError = (error: unknown): ApiError => {
  switch (errorTag(error)) {
    case "WorkspaceNotFoundError": {
      return new ApiError(404, "workspace_not_found", "Workspace not found");
    }
    case "FileRecordNotFoundError": {
      return new ApiError(404, "file_not_found", "File not found");
    }
    case "InvalidStateTransitionError": {
      return new ApiError(409, "invalid_file_state", "File state changed");
    }
    case "WorkspaceConflictError": {
      return new ApiError(409, "file_conflict", "File already exists");
    }
    default: {
      return error instanceof ApiError
        ? error
        : new ApiError(502, "metadata_unavailable", "Workspace metadata unavailable");
    }
  }
};

export const toStorageApiError = (error: unknown): ApiError => {
  switch (errorTag(error)) {
    case "ObjectKeyError": {
      return new ApiError(400, "invalid_object_key", "Object key is invalid");
    }
    case "StorageObjectNotFoundError": {
      return new ApiError(404, "file_not_found", "File not found");
    }
    default: {
      return error instanceof ApiError
        ? error
        : new ApiError(502, "storage_unavailable", "Object storage unavailable");
    }
  }
};

export const isStorageObjectNotFound = (error: unknown): boolean =>
  errorTag(error) === "StorageObjectNotFoundError";
