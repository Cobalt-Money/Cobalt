import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../../middleware/auth.js";
import { deleteAccountRouter } from "./delete-account.js";
import { lastSeenRouter } from "./last-seen.js";

export const userRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", deleteAccountRouter)
  .route("/", lastSeenRouter);
