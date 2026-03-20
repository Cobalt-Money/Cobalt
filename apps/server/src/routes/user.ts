import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const userRouter = new OpenAPIHono();

userRouter.use("/*", requireAuth);

// TODO: Port from horizon-test
// DELETE /delete-account → delete user account and all data
// GET   /last-seen       → get last seen timestamp
// POST  /last-seen       → update last seen timestamp

export { userRouter };
