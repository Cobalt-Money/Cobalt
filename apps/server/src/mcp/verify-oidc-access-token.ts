import { env } from "@cobalt-web/env/server";
// better-auth >=1.7.0-beta.4 split `verifyAccessToken` into three entry points.
// `verifyBearerToken` is the direct successor for a raw token string: same
// `{ jwksUrl, verifyOptions }` options, bearer-only semantics. The old function
// took no request context (method/URL/DPoP proof), so it could not have applied
// RFC 9449 sender-constraint checks either — no behaviour change here. Adopting
// `verifyAccessTokenRequest` to additionally support DPoP-bound tokens is a
// deliberate follow-up, not part of this bump.
import { verifyBearerToken } from "better-auth/oauth2";

function betterAuthBaseUrl(): string {
  const u = new URL(env.BETTER_AUTH_URL);
  const pathname = u.pathname.replace(/\/+$/, "") || "/";
  return pathname === "/" ? `${u.origin}/api/auth` : `${u.origin}${pathname}`;
}

/** JWT access-token claims we read after verification (Better Auth / OIDC). */
export interface McpAccessTokenPayload {
  aud?: string | string[];
  azp?: string;
  exp?: number;
  sub?: string;
}

/** `iss` in JWT must match verification; Better Auth uses `baseURL` + default path (see `betterAuthPublicBaseUrl`). */
function issuerCandidates(): string[] {
  const primary = betterAuthBaseUrl();
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
    const issuerOrigin = new URL(betterAuthBaseUrl()).origin;
    out.add(`${issuerOrigin}/api/mcp`);
    const alternate = mcpUrlWithAlternateLoopback(primary);
    if (alternate !== null) {
      out.add(alternate);
    }
  } catch {
    // invalid URL
  }
  return [...out];
}

/**
 * Validates a JWT access token issued by Better Auth's OAuth provider for the MCP resource.
 */
export async function verifyOAuthAccessTokenForMcp(
  accessToken: string,
  audienceFromRequest: string,
): Promise<McpAccessTokenPayload | null> {
  const jwksUrl = `${betterAuthBaseUrl()}/jwks`;
  const audiences = mcpAudienceCandidates(audienceFromRequest);
  const issuers = issuerCandidates();
  for (const issuer of issuers) {
    for (const audience of audiences) {
      try {
        const payload = await verifyBearerToken(accessToken, {
          jwksUrl,
          verifyOptions: {
            audience,
            issuer,
          },
        });
        return payload;
      } catch {
        // try next issuer/audience
      }
    }
  }
  return null;
}
