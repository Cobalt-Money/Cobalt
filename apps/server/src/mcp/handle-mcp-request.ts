import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { registerMcpTools } from "./tools/register-tools.js";
import { verifyOAuthAccessTokenForMcp } from "./verify-oidc-access-token.js";
import type { McpAccessTokenPayload } from "./verify-oidc-access-token.js";

function mcpResourceUrlFromOrigin(origin: string): string {
  return new URL("/api/mcp", origin).href;
}

function protectedResourceMetadataUrlFromOrigin(origin: string): string {
  const resource = mcpResourceUrlFromOrigin(origin);
  const u = new URL(resource);
  const pathSuffix = u.pathname && u.pathname !== "/" ? u.pathname : "";
  return new URL(`/.well-known/oauth-protected-resource${pathSuffix}`, u.origin)
    .href;
}

function unauthorizedResponse(origin: string, description: string): Response {
  const resourceMetadataUrl = protectedResourceMetadataUrlFromOrigin(origin);
  const safeDescription = description.replaceAll(`"`, "'");
  const wwwAuthenticate = `Bearer error="invalid_token", error_description="${safeDescription}", resource_metadata="${resourceMetadataUrl}"`;
  return Response.json(
    {
      error: "invalid_token",
      error_description: description,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": wwwAuthenticate,
      },
      status: 401,
    }
  );
}

export function getPublicOriginFromRequest(req: Request): string {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

function clientIdFromClaims(
  claims: Pick<McpAccessTokenPayload, "aud" | "azp">
): string {
  if (typeof claims.azp === "string") {
    return claims.azp;
  }
  if (Array.isArray(claims.aud)) {
    return claims.aud[0] ?? "unknown";
  }
  if (typeof claims.aud === "string") {
    return claims.aud;
  }
  return "unknown";
}

function scopesFromClaims(
  claims: Pick<McpAccessTokenPayload, "scope">
): string[] {
  if (Array.isArray(claims.scope)) {
    return claims.scope.filter(
      (scope): scope is string => typeof scope === "string"
    );
  }
  if (typeof claims.scope === "string") {
    return claims.scope.split(/\s+/).filter(Boolean);
  }
  return [];
}

/**
 * Streamable HTTP MCP entrypoint: requires `Authorization: Bearer <oauth access token>`.
 */
export async function handleMcpHttpRequest(req: Request): Promise<Response> {
  const origin = getPublicOriginFromRequest(req);
  const audience = mcpResourceUrlFromOrigin(origin);
  const authHeader = req.headers.get("authorization");
  const [type, rawToken] = authHeader?.split(/\s+/) ?? [];

  if (type?.toLowerCase() !== "bearer" || !rawToken) {
    const reqUrl = new URL(req.url);
    if (reqUrl.searchParams.has("code")) {
      return Response.json(
        {
          error: "oauth_redirect_misconfigured",
          error_description:
            "OAuth callback hit /api/mcp; use the client's redirect_uri (e.g. cursor://…), not the MCP URL.",
        },
        { headers: { "Cache-Control": "no-store" }, status: 400 }
      );
    }
    return unauthorizedResponse(
      origin,
      "Missing or invalid Authorization header; expected Bearer token."
    );
  }

  const verified = await verifyOAuthAccessTokenForMcp(rawToken, audience);
  if (!verified) {
    return unauthorizedResponse(origin, "Invalid or expired access token.");
  }

  const userId = verified.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    return unauthorizedResponse(
      origin,
      "Access token is not associated with a Cobalt user."
    );
  }

  const entitled = await userHasActiveSubscription(userId);
  if (!entitled) {
    return Response.json(
      {
        error: "subscription_required",
        error_description:
          "An active Cobalt subscription is required to use the MCP API.",
      },
      { headers: { "Cache-Control": "no-store" }, status: 403 }
    );
  }

  const authInfo = {
    clientId: clientIdFromClaims(verified),
    expiresAt: typeof verified.exp === "number" ? verified.exp : undefined,
    extra: { jwt: verified },
    resource: new URL("/api/mcp", origin),
    scopes: scopesFromClaims(verified),
    token: rawToken,
  };

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = new McpServer(
    { name: "cobalt", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } }
  );

  registerMcpTools(server, userId);

  await server.connect(transport);
  return transport.handleRequest(req, { authInfo });
}
