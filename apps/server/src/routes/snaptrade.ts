import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const snaptradeRouter = new OpenAPIHono();

snaptradeRouter.use("/*", requireAuth);

// POST /generate-connection-portal → generate SnapTrade portal URL

export { snaptradeRouter };
