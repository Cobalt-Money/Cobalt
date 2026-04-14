import { OpenAPIHono } from "@hono/zod-openapi";

import { tickersRouter } from "./tickers.js";

// requireOAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const v1Router = new OpenAPIHono().route("/tickers", tickersRouter);
