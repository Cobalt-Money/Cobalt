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
    }
    // Always reconstruct — body stream was consumed by req.text().
    return auth.handler(
      new Request(req.url, {
        body: params.toString(),
        headers: req.headers,
        method: req.method,
      })
    );
  }
  return auth.handler(req);
});

/**
 * MCP clients (Claude Desktop, ChatGPT, Claude.ai web) register without
 * `token_endpoint_auth_method` in the DCR body. Better Auth requires it to
 * be "none" for unauthenticated registrations → 401.
 *
 * We previously only injected for requests without a Cookie header, but some
 * clients (e.g. browser-based Claude.ai) may carry cookies from a prior
 * interaction even though the registration itself is unauthenticated from
 * Better Auth's perspective. Drop the session check and always inject for
 * any JSON DCR body that omits the field.
 *
 * All MCP clients use PKCE so client secrets aren't needed. Registering as a
 * public client is always correct here.
 */
authRouter.post("/oauth2/register", async (c) => {
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
      return auth.handler(
        new Request(req.url, { body: rawBody, headers, method: req.method })
      );
    }

    // Always force public-client registration. All MCP clients use PKCE and
    // never need a client secret. Some clients (e.g. Claude Desktop) send
    // `token_endpoint_auth_method: "client_secret_post"` by default, which
    // causes Better Auth to require a secret and reject the request → 401.
    const modified = { ...body, token_endpoint_auth_method: "none" };

    console.info("[dcr] registering client", {
      client_name: body.client_name,
      redirect_uris: body.redirect_uris,
      token_endpoint_auth_method: body.token_endpoint_auth_method ?? "(unset)",
    });

    const newBody = JSON.stringify(modified);
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    return auth.handler(
      new Request(req.url, { body: newBody, headers, method: req.method })
    );
  }

  // Non-JSON DCR (unexpected). Log and let Better Auth handle it.
  console.warn("[dcr] unexpected content-type:", contentType);
  return auth.handler(req);
});

authRouter.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRouter };
