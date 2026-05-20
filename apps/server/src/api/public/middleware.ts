import { auth } from "@cobalt-web/auth";
import type { CobaltOAuthScope } from "@cobalt-web/auth";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

/**
 * Extracts the `scope` claim from a JWT without re-verifying its signature.
 * Safe to use only after the token has been validated upstream (the
 * `/userinfo` call in `requireOAuth` performs full signature + expiry
 * checks); otherwise treat any returned value as untrusted.
 */
function decodeScopesUnsafe(bearer: string): string[] {
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : bearer;
  const parts = token.split(".");
  if (parts.length < 2) {
    return [];
  }
  try {
    const payload = parts[1] ?? "";
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString(
      "utf-8",
    );
    const claims = JSON.parse(json) as { scope?: string | string[] };
    if (Array.isArray(claims.scope)) {
      return claims.scope.filter((s): s is string => typeof s === "string");
    }
    if (typeof claims.scope === "string") {
      return claims.scope.split(/\s+/).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * OAuth 2.0 Bearer token authentication for the public API.
 *
 * Validates JWT access tokens issued by the OAuth2 provider plugin via the
 * /oauth2/userinfo endpoint, then sets `c.var.user` and `c.var.oauthScopes`.
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
    c.set("oauthScopes" as never, decodeScopesUnsafe(authHeader) as never);
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

/**
 * Requires the access token's `scope` claim to include `requiredScope`.
 * Must be chained after `requireOAuth` so `c.var.oauthScopes` is populated.
 * Tokens issued before scope vocabulary shipped have an empty/legacy scope
 * claim and will be rejected with 403 — clients must reauthenticate.
 */
export function requireScope(requiredScope: CobaltOAuthScope) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const scopes = (c.get("oauthScopes" as never) as string[] | undefined) ?? [];
    if (!scopes.includes(requiredScope)) {
      return c.json(
        {
          error: {
            code: "INSUFFICIENT_SCOPE",
            message: `Access token is missing the required scope: ${requiredScope}`,
          },
        },
        403,
      );
    }
    await next();
  });
}
