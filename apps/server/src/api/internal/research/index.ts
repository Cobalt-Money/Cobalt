import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";
import { balanceSheetRouter } from "./balance-sheet.js";
import { chartRouter } from "./chart.js";
import { earningsRouter } from "./earnings.js";
import { incomeRouter } from "./income.js";
import { newsRouter } from "./news.js";
import { overviewRouter } from "./overview.js";
import { quoteRouter } from "./quote.js";

export const researchRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", quoteRouter)
  .route("/", overviewRouter)
  .route("/", chartRouter)
  .route("/", earningsRouter)
  .route("/", incomeRouter)
  .route("/", balanceSheetRouter)
  .route("/", newsRouter);
