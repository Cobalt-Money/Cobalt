/**
 * Extracts the public API OpenAPI spec at build time.
 *
 * Imports only the route definitions (schemas + createRoute) — no middleware,
 * no auth, no DB. This avoids env var requirements and side effects.
 *
 * Usage: bun run extract-openapi
 * Output: openapi.json in the server root (cached by Turborepo)
 */

import { OpenAPIHono } from "@hono/zod-openapi";

import { tickersRouter } from "../src/routes/v1/tickers.js";

const app = new OpenAPIHono().route("/v1/tickers", tickersRouter);

const spec = app.getOpenAPI31Document({
  info: {
    description:
      "The Cobalt public API provides programmatic access to market data, portfolio analytics, and financial insights.",
    title: "Cobalt Public API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  security: [{ bearerAuth: [] }],
});

// Register security scheme
spec.components ??= {};
spec.components.securitySchemes = {
  bearerAuth: {
    bearerFormat: "OAuth 2.0 Access Token",
    description:
      "OAuth 2.0 access token obtained via the authorization code flow",
    scheme: "bearer",
    type: "http",
  },
};

const outputPath = new URL("../openapi.json", import.meta.url);
await Bun.write(outputPath, JSON.stringify(spec, null, 2));
console.log("OpenAPI spec written to openapi.json");
