import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { CategoryMutationError } from "@cobalt-web/server-data/categories/_shared";

const NOT_FOUND_CODES: ReadonlySet<CategoryMutationError["code"]> = new Set([
  "not_found",
  "group_not_found",
  "uncategorized_missing",
]);

/**
 * Convert a `CategoryMutationError` thrown by the data layer into a typed
 * `ApiError` with the right HTTP status. Anything else rethrows for the
 * central onError handler to turn into a 500.
 */
export function rethrowAsApiError(error: unknown): never {
  if (error instanceof CategoryMutationError) {
    const status = NOT_FOUND_CODES.has(error.code) ? 404 : 409;
    throw new ApiError(status, error.code, error.message);
  }
  throw error;
}
