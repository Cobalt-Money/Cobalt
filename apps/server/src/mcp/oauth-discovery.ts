import { COBALT_OAUTH_SCOPES } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";

/** RFC 9728 protected resource metadata for the MCP HTTP endpoint. */
export function buildMcpProtectedResourceMetadata(mcpResourceUrl: string): Record<string, unknown> {
  const u = new URL(env.BETTER_AUTH_URL);
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  const baseUrl = pathname === "/" ? `${u.origin}/api/auth` : `${u.origin}${pathname}`;
  return {
    authorization_servers: [baseUrl],
    resource: mcpResourceUrl,
    scopes_supported: [...COBALT_OAUTH_SCOPES],
  };
}
