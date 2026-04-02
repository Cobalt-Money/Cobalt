import { verifyAccessToken } from "better-auth/oauth2";

import {
  betterAuthJwksUrl,
  betterAuthPublicBaseUrl,
} from "./better-auth-base-url.js";

/** JWT access-token claims we read after verification (Better Auth / OIDC). */
export interface McpAccessTokenPayload {
  aud?: string | string[];
  azp?: string;
  exp?: number;
  scope?: string | string[];
  sub?: string;
}

/** `iss` in JWT must match verification; Better Auth uses `baseURL` + default path (see `betterAuthPublicBaseUrl`). */
function issuerCandidates(): string[] {
  const primary = betterAuthPublicBaseUrl();
  const out = new Set<string>([primary]);
  if (primary.endsWith("/")) {
    out.add(primary.slice(0, -1));
  } else {
    out.add(`${primary}/`);
  }
  return [...out];
}

/** Same host as `primary` but swapping `localhost` ↔ `127.0.0.1` (immutable). */
function mcpUrlWithAlternateLoopback(primary: string): string | null {
  try {
    const u = new URL(primary);
    let swap: string | null = null;
    if (u.hostname === "localhost") {
      swap = "127.0.0.1";
    } else if (u.hostname === "127.0.0.1") {
      swap = "localhost";
    }
    if (swap === null) {
      return null;
    }
    const hostPort = u.port ? `${swap}:${u.port}` : swap;
    return `${u.protocol}//${hostPort}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

/** Same MCP URL may be reached as `localhost` or `127.0.0.1`; JWT `aud` must match issuance `resource` exactly. */
function mcpAudienceCandidates(primary: string): string[] {
  const out = new Set<string>([primary]);
  try {
    const issuerOrigin = new URL(betterAuthPublicBaseUrl()).origin;
    out.add(`${issuerOrigin}/api/mcp`);
    const alternate = mcpUrlWithAlternateLoopback(primary);
    if (alternate !== null) {
      out.add(alternate);
    }
  } catch {
    // ignore invalid URLs
  }
  return [...out];
}

/**
 * Validates a JWT access token issued by Better Auth's OAuth provider for the MCP resource.
 */
export async function verifyOAuthAccessTokenForMcp(
  accessToken: string,
  audienceFromRequest: string
): Promise<McpAccessTokenPayload | null> {
  const jwksUrl = betterAuthJwksUrl();
  const audiences = mcpAudienceCandidates(audienceFromRequest);
  const issuers = issuerCandidates();
  for (const issuer of issuers) {
    for (const audience of audiences) {
      try {
        const payload = await verifyAccessToken(accessToken, {
          jwksUrl,
          verifyOptions: {
            audience,
            issuer,
          },
        });
        return payload;
      } catch {
        // try next issuer/audience pair
      }
    }
  }
  return null;
}
