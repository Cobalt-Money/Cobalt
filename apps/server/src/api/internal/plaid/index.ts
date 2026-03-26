import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";
import { balanceSnapshotsRouter } from "./balance-snapshots.js";
import { linkRouter } from "./link.js";
import { updateRouter } from "./update.js";

export const plaidRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", linkRouter)
  .route("/", updateRouter)
  .route("/", balanceSnapshotsRouter);
