import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const appstoreRouter = new OpenAPIHono();

appstoreRouter.use("/*", requireAuth);

// TODO: Port from horizon-test
// POST /sync → sync App Store subscription receipt

export { appstoreRouter };
