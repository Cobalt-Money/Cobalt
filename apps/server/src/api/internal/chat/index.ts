import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";
import { chatDetailRouter } from "./detail.js";
import { chatListRouter } from "./list.js";

export const chatRouter = new OpenAPIHono()
  .use("/*", requirePaidUser)
  .route("/", chatListRouter)
  .route("/", chatDetailRouter);
