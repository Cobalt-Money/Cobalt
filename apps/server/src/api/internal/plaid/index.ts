import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { balanceSnapshotsRouter } from "./balance-snapshots";
import { linkRouter } from "./link";
import { updateRouter } from "./update";
import { webhookRouter } from "./webhook";

export const plaidRouter = new OpenAPIHono()
  .route("/", webhookRouter)
  .use("/*", requireAuth)
  .route("/", linkRouter)
  .route("/", updateRouter)
  .route("/", balanceSnapshotsRouter);
