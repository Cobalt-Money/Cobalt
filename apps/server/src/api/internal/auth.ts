import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";

const authRouter = new OpenAPIHono();

/**
 * Better Auth's oauth-provider only issues a JWT access token when
 * `resource` is present in the token request body. Some clients (ChatGPT,
 * Claude Desktop) follow RFC 8707 §2 and omit `resource` from the code
 * exchange because they already sent it in the authorization request.
 * Without it, Better Auth issues an opaque token that our JWKS-based
 * verifier rejects → 401 on every MCP call.
 *
 * Fix: inject `resource` for authorization_code exchanges that omit it.
 */
const mcpAudience = `${new URL(env.BETTER_AUTH_URL).origin}/api/mcp`;

authRouter.post("/oauth2/token", async (c) => {
  const req = c.req.raw;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    if (
      params.get("grant_type") === "authorization_code" &&
      !params.has("resource")
    ) {
      params.set("resource", mcpAudience);
      return auth.handler(
        new Request(req.url, {
          body: params.toString(),
          headers: req.headers,
          method: req.method,
        })
      );
    }
  }
  return auth.handler(req);
});

/**
 * Claude Desktop registers as a confidential client by default (no
 * `token_endpoint_auth_method` in its DCR body). Better Auth requires
 * either a session or `token_endpoint_auth_method: "none"` for
 * unauthenticated registration → 401.
 *
 * All MCP clients use PKCE so client secrets aren't needed. Force
 * unauthenticated DCR requests to register as public clients.
 */
authRouter.post("/oauth2/register", async (c) => {
  const req = c.req.raw;
  const contentType = req.headers.get("content-type") ?? "";
  const hasSession = req.headers.has("cookie");
  if (!hasSession && contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body.token_endpoint_auth_method) {
      return auth.handler(
        new Request(req.url, {
          body: JSON.stringify({ ...body, token_endpoint_auth_method: "none" }),
          headers: req.headers,
          method: req.method,
        })
      );
    }
  }
  return auth.handler(req);
});

authRouter.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRouter };
