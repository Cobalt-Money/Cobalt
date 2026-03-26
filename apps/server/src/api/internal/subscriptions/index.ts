import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";
import { billingPortalRouter } from "./billing-portal.js";
import { statusRouter } from "./status.js";

export const subscriptionsRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", statusRouter)
  .route("/", billingPortalRouter);
