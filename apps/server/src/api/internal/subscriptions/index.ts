import { OpenAPIHono } from "@hono/zod-openapi";

import { billingPortalRouter } from "./billing-portal.js";
import { statusRouter } from "./status.js";

// requireAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const subscriptionsRouter = new OpenAPIHono()
  .route("/", statusRouter)
  .route("/", billingPortalRouter);
