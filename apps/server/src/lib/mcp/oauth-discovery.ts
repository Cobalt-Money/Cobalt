import { betterAuthPublicBaseUrl } from "./better-auth-base-url.js";

/** RFC 9728 protected resource metadata for the MCP HTTP endpoint. */
export function buildMcpProtectedResourceMetadata(
  mcpResourceUrl: string
): Record<string, unknown> {
  return {
    authorization_servers: [betterAuthPublicBaseUrl()],
    resource: mcpResourceUrl,
    scopes_supported: ["openid", "profile", "email", "offline_access"],
  };
}
