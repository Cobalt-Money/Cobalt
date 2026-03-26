import type { Context } from "hono";

type ErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR";

const STATUS_MAP: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422,
};

export function apiError(
  c: Context,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return c.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    STATUS_MAP[code] as 400 | 401 | 403 | 404 | 422 | 500
  );
}
