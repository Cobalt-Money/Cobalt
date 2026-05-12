/**
 * Generic API error thrown from the data/server layer.
 * Surfaces as `{ code, error }` JSON via the central onError handler in
 * `apps/server/src/lib/create-app.ts`.
 *
 * Use a stable snake_case `code` so RPC clients can switch on it.
 * Use a neutral `message` (e.g. "Tag not found") that does NOT differentiate
 * "missing" from "unowned" — prevents enumeration leaks.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}
