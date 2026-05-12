import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTPException } from "hono/http-exception";

/**
 * Factory for sub-routers. Wires:
 *   - `defaultHook` — Zod validation failures short-circuit to typed 422
 *     (pair each `createRoute` with `validationErrorResponse(inputSchema)`).
 *   - `onError` — uncaught throws funnel to a uniform 500 JSON. Throw
 *     `ApiError(status, code, message)` for typed `{code, error}` JSON responses,
 *     or `HTTPException` for fully custom Response objects.
 */
export const createApp = <E extends AppEnv = AppEnv>() =>
  new OpenAPIHono<E>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: {
              issues: result.error.issues.map((issue) => ({
                code: issue.code,
                message: issue.message,
                path: issue.path,
              })),
              name: result.error.name,
            },
            success: false,
          },
          422,
        );
      }
    },
    // biome-ignore lint/suspicious/useAwait: hono onError callback signature
    // oxlint-disable-next-line prefer-await-to-callbacks
  }).onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    if (err instanceof ApiError) {
      return c.json({ code: err.code, error: err.message }, err.status as ContentfulStatusCode);
    }
    console.error("[server error]", { method: c.req.method, path: c.req.path }, err);
    return c.json({ error: "Internal server error" }, 500);
  });
