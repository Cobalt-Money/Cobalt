import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";

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

const authRouter = new OpenAPIHono()
  .post("/oauth2/token", async (c) => {
    const req = c.req.raw;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const bodyText = await req.text();
      const params = new URLSearchParams(bodyText);
      if (params.get("grant_type") === "authorization_code" && !params.has("resource")) {
        params.set("resource", mcpAudience);
      }
      // Always reconstruct — body stream was consumed by req.text().
      return auth.handler(
        new Request(req.url, {
          body: params.toString(),
          headers: req.headers,
          method: req.method,
        }),
      );
    }
    return auth.handler(req);
  })
  /**
   * MCP clients (Claude Desktop, Claude.ai, ChatGPT) default to
   * `token_endpoint_auth_method: "client_secret_post"` per RFC 7591, but all
   * MCP clients use PKCE and never need a client secret. Better Auth rejects
   * unauthenticated DCR unless the client registers as public ("none") → 401.
   *
   * Fix: unconditionally override to "none" for all JSON DCR requests.
   */
  .post("/oauth2/register", async (c) => {
    const req = c.req.raw;
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const rawBody = await req.text();
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // Invalid JSON — reconstruct and let auth reject it cleanly.
        const headers = new Headers(req.headers);
        headers.delete("content-length");
        return auth.handler(new Request(req.url, { body: rawBody, headers, method: req.method }));
      }

      const newBody = JSON.stringify({
        ...body,
        token_endpoint_auth_method: "none",
      });
      const headers = new Headers(req.headers);
      headers.delete("content-length");
      return auth.handler(new Request(req.url, { body: newBody, headers, method: req.method }));
    }

    // Non-JSON DCR (unexpected). Log and let Better Auth handle it.
    console.warn("[dcr] unexpected content-type:", contentType);
    return auth.handler(req);
  })
  .on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRouter };
