import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { deleteAccountRouter } from "./delete-account";
import { lastSeenRouter } from "./last-seen";

export const userRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", deleteAccountRouter)
  .route("/", lastSeenRouter);
