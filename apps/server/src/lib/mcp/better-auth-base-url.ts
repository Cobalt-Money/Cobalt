import { env } from "@cobalt-web/env/server";

/**
 * Canonical Better Auth base URL — same as `ctx.context.baseURL` / JWT `iss` when using
 * the default `basePath` (`/api/auth`). Matches `better-auth`'s `getBaseURL` + `withPath`:
 * origin-only env values become `{origin}/api/auth`; URLs that already include a path are kept.
 */
export function betterAuthPublicBaseUrl(): string {
  const u = new URL(env.BETTER_AUTH_URL);
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  if (pathname !== "/") {
    return `${u.origin}${pathname}`;
  }
  return `${u.origin}/api/auth`;
}

export function betterAuthJwksUrl(): string {
  return `${betterAuthPublicBaseUrl()}/jwks`;
}
