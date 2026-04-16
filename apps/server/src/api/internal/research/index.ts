import { OpenAPIHono } from "@hono/zod-openapi";

import { balanceSheetRouter } from "./balance-sheet.js";
import { batchQuotesRouter } from "./batch-quotes.js";
import { chartRouter } from "./chart.js";
import { earningsRouter } from "./earnings.js";
import { incomeRouter } from "./income.js";
import { newsRouter } from "./news.js";
import { overviewRouter } from "./overview.js";
import { quoteRouter } from "./quote.js";
import { screenerRouter } from "./screener.js";
import { tickerPriceRouter } from "./ticker-price.js";
import { tickerSearchRouter } from "./ticker-search.js";

// requireAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const researchRouter = new OpenAPIHono()
  .route("/", quoteRouter)
  .route("/", overviewRouter)
  .route("/", chartRouter)
  .route("/", earningsRouter)
  .route("/", incomeRouter)
  .route("/", balanceSheetRouter)
  .route("/", newsRouter)
  .route("/", tickerSearchRouter)
  .route("/", tickerPriceRouter)
  .route("/", screenerRouter)
  .route("/", batchQuotesRouter);
