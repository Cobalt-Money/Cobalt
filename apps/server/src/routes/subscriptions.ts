import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const subscriptionsRouter = new OpenAPIHono();

subscriptionsRouter.use("/*", requireAuth);

// GET  /               → get subscription status
// POST /billing-portal → create Stripe billing portal session

export { subscriptionsRouter };
