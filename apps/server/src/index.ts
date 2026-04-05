import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { accountsRouter } from "./api/internal/accounts/index.js";
import { appstoreRouter } from "./api/internal/appstore.js";
import { authRouter } from "./api/internal/auth.js";
import { brokerageRouter } from "./api/internal/brokerage/index.js";
import { chatRouter } from "./api/internal/chat/index.js";
import { institutionsRouter } from "./api/internal/institutions.js";
import { newsRouter } from "./api/internal/news.js";
import { plaidRouter } from "./api/internal/plaid/index.js";
import { researchRouter } from "./api/internal/research/index.js";
import { snaptradeRouter } from "./api/internal/snaptrade/index.js";
import { subscriptionsRouter } from "./api/internal/subscriptions/index.js";
import { transactionsRouter } from "./api/internal/transactions/index.js";
import { userRouter } from "./api/internal/user/index.js";
import { zeroRouter } from "./api/internal/zero.js";
import { v1Router } from "./api/public/v1/index.js";
import {
  getPublicOriginFromRequest,
  handleMcpHttpRequest,
} from "./mcp/handle-mcp-request.js";
import { buildMcpProtectedResourceMetadata } from "./mcp/oauth-discovery.js";

const base = new OpenAPIHono();
const publicApi = new OpenAPIHono();
const app = new Hono();
const oauthAuthServerMetadata = oauthProviderAuthServerMetadata(auth as never);
const oauthOpenIdConfigMetadata = oauthProviderOpenIdConfigMetadata(
  auth as never
);

// ── Global Middleware ───────────────────────────────────────────────

app.use(logger());
app.use(
  "/*",
  cors({
    allowHeaders: [
      "Accept",
      "Authorization",
      "Content-Type",
      "Last-Event-ID",
      "Mcp-Protocol-Version",
      "Mcp-Session-Id",
      "mcp-protocol-version",
      "mcp-session-id",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["Mcp-Session-Id", "mcp-session-id"],
    origin: env.CORS_ORIGIN,
  })
);

// ── MCP + OAuth discovery (Streamable HTTP + RFC 9728 / AS metadata) ─

// RFC 9728 — Protected Resource Metadata. First endpoint clients hit to
// discover which authorization server protects the MCP resource.
app.get("/.well-known/oauth-protected-resource/api/mcp", (c) => {
  const origin = getPublicOriginFromRequest(c.req.raw);
  const mcpResourceUrl = new URL("/api/mcp", origin).href;
  return c.json(buildMcpProtectedResourceMetadata(mcpResourceUrl));
});

// RFC 8414 — Authorization Server Metadata (path-suffixed for issuer /api/auth).
// Exposes authorize, token, registration, JWKS, and revocation endpoints.
app.get("/.well-known/oauth-authorization-server/api/auth", (c) =>
  oauthAuthServerMetadata(c.req.raw)
);

// OpenID Connect Discovery — same metadata as above for OIDC-aware clients.
app.get("/.well-known/openid-configuration", (c) =>
  oauthOpenIdConfigMetadata(c.req.raw)
);

// Streamable HTTP MCP transport — requires Bearer token from the OAuth flow above.
app.all("/api/mcp", (c) => handleMcpHttpRequest(c.req.raw));

// ── Routes ──────────────────────────────────────────────────────────

base
  .route("/api/auth", authRouter)
  .route("/api/zero", zeroRouter)
  .route("/api/accounts", accountsRouter)
  .route("/api/transactions", transactionsRouter)
  .route("/api/brokerage", brokerageRouter)
  .route("/api/chat", chatRouter)
  .route("/api/news", newsRouter)
  .route("/api/research", researchRouter)
  .route("/api/snaptrade", snaptradeRouter)
  .route("/api/subscriptions", subscriptionsRouter)
  .route("/api/user", userRouter)
  .route("/api/institutions", institutionsRouter)
  .route("/api/plaid", plaidRouter)
  .route("/api/appstore", appstoreRouter);

// ── Public API ──────────────────────────────────────────────────────

publicApi.route("/v1", v1Router);

publicApi.doc("/v1/openapi.json", {
  info: {
    description:
      "The Cobalt public API provides programmatic access to market data, portfolio analytics, and financial insights.",
    title: "Cobalt Public API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  security: [{ bearerAuth: [] }],
  servers: [{ description: "Production", url: "https://api.cobaltpf.com" }],
});

publicApi.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  bearerFormat: "OAuth 2.0 Access Token",
  description:
    "OAuth 2.0 access token obtained via the authorization code flow",
  scheme: "bearer",
  type: "http",
});

// ── Health ──────────────────────────────────────────────────────────

app.get("/", (c) => c.text("OK"));

// ── OpenAPI Docs (Cobalt spec + Better Auth via Scalar `sources`) ───

base.doc31("/openapi.json", {
  info: {
    description: "Cobalt financial platform API",
    title: "Cobalt API",
    version: "0.1.0",
  },
  openapi: "3.1.0",
});

app.get(
  "/docs",
  Scalar({
    hideModels: true,
    pageTitle: "Cobalt API",
    sources: [
      { title: "Cobalt API", url: "/openapi.json" },
      {
        title: "Better Auth",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  })
);

// ── Mount OpenAPI apps ──────────────────────────────────────────────

app.route("/", base);
app.route("/", publicApi);

export type AppType = typeof app;

export default app;
