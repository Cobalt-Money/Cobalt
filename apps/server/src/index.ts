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
import { alertsRouter } from "./api/internal/alerts/index.js";
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
import { cronRefreshFundamentalsRouter } from "./cron/refresh-fundamentals.js";
import {
  getPublicOriginFromRequest,
  handleMcpHttpRequest,
} from "./mcp/handle-mcp-request.js";
import { buildMcpProtectedResourceMetadata } from "./mcp/oauth-discovery.js";
import { plaidWebhookRouter } from "./webhooks/plaid.js";
import { snaptradeWebhookRouter } from "./webhooks/snaptrade.js";

/**
 * IMPORTANT — Hono RPC contract
 *
 * Every route/middleware registration in this file must be chained into the
 * `const` declaration it belongs to. Hono's `.route()`, `.get()`, `.post()`,
 * `.use()`, etc. return a *new* type with the accumulated route schema; the
 * statement form (`const app = new Hono(); app.route(...)`) throws that type
 * away and `typeof app` stays empty. The runtime still works, but `hc<AppType>`
 * in the web client ends up untyped.
 *
 * If you need to add a route conditionally or in a loop, capture the chain
 * result into a new `const` and continue from there — never mutate the bare
 * variable via a statement call.
 */

// ── OAuth discovery helpers ─────────────────────────────────────────

const oauthAuthServerMetadata = oauthProviderAuthServerMetadata(auth as never);
const oauthOpenIdConfigMetadata = oauthProviderOpenIdConfigMetadata(
  auth as never
);

// Stable Hono-compatible wrapper so both well-known mount paths below can
// reuse the same handler.
const oauthAuthServerMetadataHandler = (c: { req: { raw: Request } }) =>
  oauthAuthServerMetadata(c.req.raw);

// ── Internal API ────────────────────────────────────────────────────

// `/api/*` routes consumed by our own web + mobile clients. Hosted on an
// `OpenAPIHono` so every router can expose Zod-derived schemas that feed
// the `/openapi.json` document (used for Swift codegen and the in-repo
// API reference at `/docs`).
//
// **Why statement-form mounts here?** Chaining all 14 sub-routers into a
// single `new OpenAPIHono().route(...).route(...)` compound blows
// TypeScript's recursion depth (TS2589) because each `.route()` call
// merges the sub-router's accumulated OpenAPI schema into the parent
// type, and the merger is quadratic in route count. The runtime is
// completely unaffected by authoring style, so we mount via statements
// here and let the web client pull types directly from each sub-router
// type export below. This is the pattern the Hono docs recommend for
// large RPC apps:
// https://hono.dev/docs/guides/rpc#split-your-app-into-multiple-files
const base: OpenAPIHono = new OpenAPIHono();
base.route("/api/auth", authRouter);
base.route("/api/zero", zeroRouter);
base.route("/api/accounts", accountsRouter);
base.route("/api/alerts", alertsRouter);
base.route("/api/transactions", transactionsRouter);
base.route("/api/brokerage", brokerageRouter);
base.route("/api/chat", chatRouter);
base.route("/api/news", newsRouter);
base.route("/api/research", researchRouter);
base.route("/api/snaptrade", snaptradeRouter);
base.route("/api/subscriptions", subscriptionsRouter);
base.route("/api/user", userRouter);
base.route("/api/institutions", institutionsRouter);
base.route("/api/plaid", plaidRouter);
base.route("/api/appstore", appstoreRouter);
base.doc31("/openapi.json", {
  info: {
    description: "Cobalt financial platform API",
    title: "Cobalt API",
    version: "0.1.0",
  },
  openapi: "3.1.0",
});

// ── Public API ──────────────────────────────────────────────────────

// Third-party developer surface at `/v1`. Kept on its own `OpenAPIHono`
// instance so it can publish an independent title, server URL, and auth
// scheme at `/v1/openapi.json` without leaking internal routes.
const publicApi = new OpenAPIHono()
  .route("/v1", v1Router)
  .doc("/v1/openapi.json", {
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

// `registerComponent` mutates the schema registry (not the Hono instance)
// and doesn't return anything useful, so it runs as a side-effect statement
// after the const. Not subject to the chain-return contract above.
publicApi.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  bearerFormat: "OAuth 2.0 Access Token",
  description:
    "OAuth 2.0 access token obtained via the authorization code flow",
  scheme: "bearer",
  type: "http",
});

// ── Root app ────────────────────────────────────────────────────────

const app = new Hono()
  .use(logger())
  .use(
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
  )
  // RFC 9728 — Protected Resource Metadata. First endpoint clients hit to
  // discover which authorization server protects the MCP resource.
  .get("/.well-known/oauth-protected-resource/api/mcp", (c) => {
    const origin = getPublicOriginFromRequest(c.req.raw);
    const mcpResourceUrl = new URL("/api/mcp", origin).href;
    return c.json(buildMcpProtectedResourceMetadata(mcpResourceUrl));
  })
  // RFC 8414 — Authorization Server Metadata (path-suffixed for issuer
  // /api/auth). Exposes authorize, token, registration, JWKS, and revocation
  // endpoints.
  .get(
    "/.well-known/oauth-authorization-server/api/auth",
    oauthAuthServerMetadataHandler
  )
  // Some clients probe the root well-known path; serve the same document to
  // avoid 404 noise.
  .get(
    "/.well-known/oauth-authorization-server",
    oauthAuthServerMetadataHandler
  )
  // OpenID Connect Discovery — same metadata as above for OIDC-aware clients.
  .get("/.well-known/openid-configuration", (c) =>
    oauthOpenIdConfigMetadata(c.req.raw)
  )
  // Streamable HTTP MCP transport — requires Bearer token from the OAuth
  // flow above.
  .all("/api/mcp", (c) => handleMcpHttpRequest(c.req.raw))
  // Cron routes (no user auth — protected by CRON_SECRET)
  .route("/api/cron", cronRefreshFundamentalsRouter)
  // Webhook routes (no user auth — verified by provider signatures)
  .route("/webhooks/plaid", plaidWebhookRouter)
  .route("/webhooks/snaptrade", snaptradeWebhookRouter)
  .get("/", (c) => c.text("OK"))
  .get(
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
  )
  .route("/", base)
  .route("/", publicApi);

// `typeof app` only carries the routes directly registered on `app`
// (well-known / mcp / docs / `/v1` public API) because the `/api/*`
// sub-routers are mounted on `base` via statement form to avoid TS2589.
// Per-sub-router types are exported below so the web client can build
// one typed `hc<…>()` proxy per feature — each proxy computes a shallow
// schema type and avoids the recursion depth blow-up.
export type AppType = typeof app;
export type AccountsRouter = typeof accountsRouter;
export type AlertsRouter = typeof alertsRouter;
export type AppstoreRouter = typeof appstoreRouter;
export type BrokerageRouter = typeof brokerageRouter;
export type ChatRouter = typeof chatRouter;
export type InstitutionsRouter = typeof institutionsRouter;
export type NewsRouter = typeof newsRouter;
export type PlaidRouter = typeof plaidRouter;
export type ResearchRouter = typeof researchRouter;
export type SnaptradeRouter = typeof snaptradeRouter;
export type SubscriptionsRouter = typeof subscriptionsRouter;
export type TransactionsRouter = typeof transactionsRouter;
export type UserRouter = typeof userRouter;

export default app;
