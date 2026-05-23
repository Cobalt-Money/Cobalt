import { OpenAPIHono } from "@hono/zod-openapi";

import { activityRouter } from "./activity.js";
import { createRouter } from "./create.js";
import { detailRouter } from "./detail.js";
import { geocodeRouter } from "./geocode.js";
import { listRouter } from "./list.js";
import { patchRouter } from "./patch.js";
import { recurringRouter } from "./recurring.js";
import { spendingRouter } from "./spending.js";
import { tagsRouter } from "./tags.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const transactionsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", createRouter)
  .route("/", recurringRouter)
  .route("/", spendingRouter)
  .route("/", patchRouter)
  .route("/", tagsRouter)
  .route("/", activityRouter)
  .route("/", geocodeRouter)
  .route("/", detailRouter);
