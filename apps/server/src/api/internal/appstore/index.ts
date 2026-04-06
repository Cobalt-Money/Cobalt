import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { syncRouter } from "./sync";
import { appstoreWebhookRouter } from "./webhook";

export const appstoreRouter = new OpenAPIHono<AppEnv>()
  .route("/", appstoreWebhookRouter)
  .use("/*", requireAuth)
  .route("/", syncRouter);
