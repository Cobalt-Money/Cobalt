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
import { chatRouter } from "./api/internal/chat.js";
import { institutionsRouter } from "./api/internal/institutions.js";
import { newsRouter } from "./api/internal/news.js";
import { plaidRouter } from "./api/internal/plaid/index.js";
import { researchRouter } from "./api/internal/research.js";
import { snaptradeRouter } from "./api/internal/snaptrade/index.js";
import { subscriptionsRouter } from "./api/internal/subscriptions/index.js";
import { tickersRouter } from "./api/internal/tickers.js";
import { transactionsRouter } from "./api/internal/transactions/index.js";
import { userRouter } from "./api/internal/user/index.js";
import { zeroRouter } from "./api/internal/zero.js";
import { v1Router } from "./api/public/v1/index.js";

const base = new OpenAPIHono();
const publicApi = new OpenAPIHono();
const app = new Hono();

// ── Global Middleware ───────────────────────────────────────────────

app.use(logger());
app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    origin: env.CORS_ORIGIN,
  })
);

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
  .route("/api/tickers", tickersRouter)
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
  servers: [
    { description: "Production", url: "https://cobalt-server.vercel.app" },
  ],
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
