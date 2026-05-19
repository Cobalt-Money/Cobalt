import { ApiError } from "../_shared/api-error.js";

/**
 * Wraps an FMP-backed call so transport / API failures surface as a typed
 * `ApiError(502, "fmp_upstream_failed")` for the central onError handler.
 * Re-throws existing `ApiError`s untouched.
 */
export async function withFmpUpstream<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown FMP error";
    throw new ApiError(502, "fmp_upstream_failed", message);
  }
}
