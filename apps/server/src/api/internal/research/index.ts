import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { balanceSheetRouter } from "./balance-sheet";
import { chartRouter } from "./chart";
import { earningsRouter } from "./earnings";
import { incomeRouter } from "./income";
import { newsRouter } from "./news";
import { overviewRouter } from "./overview";
import { quoteRouter } from "./quote";
import { tickerPriceRouter } from "./ticker-price";
import { tickerSearchRouter } from "./ticker-search";

export const researchRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", quoteRouter)
  .route("/", overviewRouter)
  .route("/", chartRouter)
  .route("/", earningsRouter)
  .route("/", incomeRouter)
  .route("/", balanceSheetRouter)
  .route("/", newsRouter)
  .route("/", tickerSearchRouter)
  .route("/", tickerPriceRouter);
