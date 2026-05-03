import { OpenAPIHono } from "@hono/zod-openapi";

import { chartRouter } from "./chart.js";
import { newsRouter } from "./news.js";
import { overviewRouter } from "./overview.js";
import { quoteRouter } from "./quote.js";
import { screenerRouter } from "./screener.js";
import { tickerSearchRouter } from "./ticker-search.js";

// requireAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const researchRouter = new OpenAPIHono()
  .route("/", quoteRouter)
  .route("/", overviewRouter)
  .route("/", chartRouter)
  .route("/", newsRouter)
  .route("/", tickerSearchRouter)
  .route("/", screenerRouter);
