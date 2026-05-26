import { OpenAPIHono } from "@hono/zod-openapi";

import { accountsRouter } from "./accounts/index.js";
import { activitiesRouter } from "./activities.js";
import { balanceSnapshotsRouter } from "./balance-snapshots.js";
import { categoriesRouter } from "./categories.js";
import { portfolioSnapshotsRouter } from "./portfolio-snapshots.js";
import { positionsRouter } from "./positions.js";
import { recurringRouter } from "./recurring.js";
import { spendingRouter } from "./spending.js";
import { tagsRouter } from "./tags/index.js";
import { transactionsRouter } from "./transactions/index.js";

/**
 * Public REST surface — `/v1/*`. Versioned, key-authed, SDK-targeted.
 *
 * Separate from `/api/*` (internal) because:
 *   - Auth model differs (Bearer API key vs session cookie)
 *   - Stability contract differs (versioned, breaking changes require /v2)
 *   - Schema surface differs (public-safe fields only — no internal IDs)
 *   - OpenAPI doc is served separately at `/v1/openapi.json` for SDK codegen
 */
export const v1: OpenAPIHono = new OpenAPIHono();

v1.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  bearerFormat: "API key",
  description: "Cobalt API key (prefix `ck_live_`). Issue from dashboard → Settings → API keys.",
  scheme: "bearer",
  type: "http",
});

v1.route("/", accountsRouter);
v1.route("/", transactionsRouter);
v1.route("/", tagsRouter);
v1.route("/", positionsRouter);
v1.route("/", activitiesRouter);
v1.route("/", portfolioSnapshotsRouter);
v1.route("/", balanceSnapshotsRouter);
v1.route("/", categoriesRouter);
v1.route("/", recurringRouter);
v1.route("/", spendingRouter);

/**
 * Typed JSON 404 for unmatched `/v1/*` paths. Hono's default returns a
 * `text/plain` body that escapes the public `errorResponseWithCodeSchema`
 * contract — bare 404s also looked like CORS failures to browser SDK clients
 * because the route never reached middleware that set headers (SRI-345 #10).
 */
v1.notFound((c) =>
  c.json({ code: "not_found", error: `No such endpoint: ${c.req.method} ${c.req.path}` }, 404),
);

v1.doc31("/openapi.json", {
  info: {
    description: "Cobalt public REST API. Stable, versioned, SDK-generated.",
    title: "Cobalt API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  security: [{ bearerAuth: [] }],
  servers: [{ url: "https://api.cobaltpf.com/v1" }],
});

export type V1Router = typeof v1;
