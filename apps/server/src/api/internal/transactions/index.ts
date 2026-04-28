import { OpenAPIHono } from "@hono/zod-openapi";

import { activityRouter } from "./activity.js";
import { creditSpendingRouter } from "./credit-spending.js";
import { geocodeRouter } from "./geocode.js";
import { listRouter } from "./list.js";
import { overridesRouter } from "./overrides.js";
import { recurringRouter } from "./recurring.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const transactionsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", creditSpendingRouter)
  .route("/", overridesRouter)
  .route("/", activityRouter)
  .route("/", geocodeRouter);
