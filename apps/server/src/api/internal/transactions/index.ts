import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";
import { creditSpendingRouter } from "./credit-spending.js";
import { listRouter } from "./list.js";
import { overridesRouter } from "./overrides.js";
import { recurringRouter } from "./recurring.js";

export const transactionsRouter = new OpenAPIHono()
  .use("/*", requirePaidUser)
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", creditSpendingRouter)
  .route("/", overridesRouter);
