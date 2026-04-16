import { OpenAPIHono } from "@hono/zod-openapi";

import { chatCreateRouter } from "./create.js";
import { chatDetailRouter } from "./detail.js";
import { chatListRouter } from "./list.js";
import { chatStreamRouter } from "./stream.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const chatRouter = new OpenAPIHono()
  .route("/", chatListRouter)
  .route("/", chatDetailRouter)
  .route("/", chatCreateRouter)
  .route("/", chatStreamRouter);
