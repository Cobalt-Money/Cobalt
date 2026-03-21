import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const appstoreRouter = new OpenAPIHono();

appstoreRouter.use("/*", requireAuth);

// POST /sync → sync App Store subscription receipt

export { appstoreRouter };
