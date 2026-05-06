import { OpenAPIHono } from "@hono/zod-openapi";

import { activityRouter } from "./activity.js";
import { spendingRouter } from "./spending.js";
import { geocodeRouter } from "./geocode.js";
import { listRouter } from "./list.js";
import { overridesRouter } from "./overrides.js";
import { recurringRouter } from "./recurring.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const transactionsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", recurringRouter)
  .route("/", spendingRouter)
  .route("/", overridesRouter)
  .route("/", activityRouter)
  .route("/", geocodeRouter);
