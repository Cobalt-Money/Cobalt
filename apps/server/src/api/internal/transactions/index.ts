import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware";
import { creditSpendingRouter } from "./credit-spending";
import { listRouter } from "./list";
import { overridesRouter } from "./overrides";
import { recurringRouter } from "./recurring";

export const transactionsRouter = new OpenAPIHono()
  .use("/*", requirePaidUser)
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", creditSpendingRouter)
  .route("/", overridesRouter);
