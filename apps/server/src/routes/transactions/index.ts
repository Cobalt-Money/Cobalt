import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../../middleware/auth.js";
import { creditSpendingRouter } from "./credit-spending.js";
import { listRouter } from "./list.js";
import { overridesRouter } from "./overrides.js";
import { recurringRouter } from "./recurring.js";

export const transactionsRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", creditSpendingRouter)
  .route("/", overridesRouter);
