import { OpenAPIHono } from "@hono/zod-openapi";

import { chatDetailRouter } from "./detail.js";
import { chatListRouter } from "./list.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const chatRouter = new OpenAPIHono()
  .route("/", chatListRouter)
  .route("/", chatDetailRouter);
