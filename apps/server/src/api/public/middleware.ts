import { auth } from "@cobalt-web/auth";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

/**
 * OAuth 2.0 Bearer token authentication for the public API.
 *
 * Uses Better Auth's bearer plugin to resolve access tokens
 * to sessions. Sets c.var.user and c.var.session on success.
 */
export const requireOAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired access token",
        },
      },
      401
    );
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
