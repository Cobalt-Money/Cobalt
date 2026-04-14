import { OpenAPIHono } from "@hono/zod-openapi";

import { requireOAuth } from "../middleware.js";
import { tickersRouter } from "./tickers.js";

// Statement-form on purpose: `.use("/*", requireOAuth)` returns a plain
// `Hono` which drops OpenAPIHono's `.openapi` method, but the public API
// isn't exposed through `hc<…>()` on the web client, so the chain-type
// contract doesn't apply here. The key constraint in this file is that
// `tickersRouter` must not import any middleware itself — see the note
// in `tickers.ts` — because `scripts/extract-openapi.ts` imports it at
// build time without env vars loaded.
const v1Router = new OpenAPIHono();
v1Router.use("/*", requireOAuth);
v1Router.route("/tickers", tickersRouter);

export { v1Router };
