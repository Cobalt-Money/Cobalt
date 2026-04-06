import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { billingPortalRouter } from "./billing-portal";
import { statusRouter } from "./status";

export const subscriptionsRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", statusRouter)
  .route("/", billingPortalRouter);
