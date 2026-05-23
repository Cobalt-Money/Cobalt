import { OpenAPIHono } from "@hono/zod-openapi";

import { detailRouter } from "./detail.js";
import { detailDbRouter } from "./detail-db.js";
import { searchRouter } from "./search.js";
import { syncRouter } from "./sync.js";

// requireAuth applied per-route via createRoute middleware (sync only; search/detail are public)
export const institutionsRouter = new OpenAPIHono()
  .route("/", searchRouter)
  .route("/", detailDbRouter)
  .route("/", syncRouter)
  .route("/", detailRouter);
