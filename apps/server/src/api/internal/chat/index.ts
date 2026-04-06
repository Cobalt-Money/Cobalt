import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware";
import { chatDetailRouter } from "./detail";
import { chatListRouter } from "./list";

export const chatRouter = new OpenAPIHono()
  .use("/*", requirePaidUser)
  .route("/", chatListRouter)
  .route("/", chatDetailRouter);
