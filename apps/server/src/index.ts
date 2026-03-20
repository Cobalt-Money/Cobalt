import { env } from "@cobalt-web/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { accountsRouter } from "./routes/accounts.js";
import { appstoreRouter } from "./routes/appstore.js";
import { authRouter } from "./routes/auth.js";
import { brokerageRouter } from "./routes/brokerage.js";
import { chatRouter } from "./routes/chat.js";
import { institutionsRouter } from "./routes/institutions.js";
import { newsRouter } from "./routes/news.js";
import { plaidRouter } from "./routes/plaid.js";
import { researchRouter } from "./routes/research.js";
import { snaptradeRouter } from "./routes/snaptrade.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { tickersRouter } from "./routes/tickers.js";
import { transactionsRouter } from "./routes/transactions/index.js";
import { userRouter } from "./routes/user.js";
import { zeroRouter } from "./routes/zero.js";

const base = new OpenAPIHono();

// ── Global Middleware ───────────────────────────────────────────────

base.use(logger());
base.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    origin: env.CORS_ORIGIN,
  })
);

// ── Routes ──────────────────────────────────────────────────────────

const app = base
  .route("/api/auth", authRouter)
  .route("/api/zero", zeroRouter)
  .route("/api/accounts", accountsRouter)
  .route("/api/transactions", transactionsRouter)
  .route("/api/brokerage", brokerageRouter)
  .route("/api/chat", chatRouter)
  .route("/api/news", newsRouter)
  .route("/api/research", researchRouter)
  .route("/api/tickers", tickersRouter)
  .route("/api/plaid", plaidRouter)
  .route("/api/snaptrade", snaptradeRouter)
  .route("/api/subscriptions", subscriptionsRouter)
  .route("/api/user", userRouter)
  .route("/api/institutions", institutionsRouter)
  .route("/api/appstore", appstoreRouter);

// ── Health ──────────────────────────────────────────────────────────

base.get("/", (c) => c.text("OK"));

// ── OpenAPI Docs ────────────────────────────────────────────────────

base.doc("/openapi.json", {
  info: {
    description: "Cobalt financial platform API",
    title: "Cobalt API",
    version: "0.1.0",
  },
  openapi: "3.1.0",
});

base.get(
  "/docs",
  apiReference({
    spec: { url: "/openapi.json" },
    theme: "none",
  })
);

export type AppType = typeof app;

export default app;
