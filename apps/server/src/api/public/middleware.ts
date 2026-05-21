import { auth } from "@cobalt-web/auth";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

/**
 * OAuth 2.0 Bearer token authentication for the public API.
 *
 * Validates JWT access tokens issued by the OAuth2 provider plugin via the
 * /oauth2/userinfo endpoint, then sets `c.var.user`.
 */
export const requireOAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing bearer token",
        },
      },
      401,
    );
  }
  try {
    const userInfo = await auth.api.oauth2UserInfo({
      headers: new Headers({ authorization: authHeader }),
    });
    if (!userInfo?.sub) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired access token",
          },
        },
        401,
      );
    }
    c.set("user", {
      createdAt: new Date(),
      email: userInfo.email ?? "",
      emailVerified: userInfo.email_verified ?? false,
      id: userInfo.sub,
      image: userInfo.picture ?? null,
      name: userInfo.name ?? "",
      updatedAt: new Date(),
    } as never);
    await next();
  } catch {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or expired access token",
        },
      },
      401,
    );
  }
});
