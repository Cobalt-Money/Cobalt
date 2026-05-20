import { OpenAPIHono } from "@hono/zod-openapi";

import { requireOAuth, requireScope } from "../middleware.js";
import { accountsRouter } from "./accounts.js";
import { networthRouter } from "./networth.js";
import { tickersRouter } from "./tickers.js";
import { transactionsRouter } from "./transactions.js";

// Statement-form on purpose: `.use("/*", requireOAuth)` returns a plain
// `Hono` which drops OpenAPIHono's `.openapi` method, but the public API
// isn't exposed through `hc<…>()` on the web client, so the chain-type
// contract doesn't apply here. The key constraint in this file is that
// `tickersRouter` must not import any middleware itself — see the note
// in `tickers.ts` — because `scripts/extract-openapi.ts` imports it at
// build time without env vars loaded.
const v1Router = new OpenAPIHono();
v1Router.use("/*", requireOAuth);
// All current v1 routes only read data, so the umbrella scope check is
// sufficient. Move this onto specific subroutes if/when a write endpoint
// lands and should require `cobalt:write` instead.
v1Router.use("/*", requireScope("cobalt:read"));
v1Router.route("/accounts", accountsRouter);
v1Router.route("/networth", networthRouter);
v1Router.route("/tickers", tickersRouter);
v1Router.route("/transactions", transactionsRouter);

export { v1Router };
