import { OpenAPIHono } from "@hono/zod-openapi";

import { deleteAccountRouter } from "./delete-account.js";
import { lastSeenRouter } from "./last-seen.js";

// requireAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const userRouter = new OpenAPIHono()
  .route("/", deleteAccountRouter)
  .route("/", lastSeenRouter);
