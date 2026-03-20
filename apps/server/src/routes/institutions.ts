import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const institutionsRouter = new OpenAPIHono();

institutionsRouter.use("/*", requireAuth);

// TODO: Port from horizon-test
// GET /search → search institutions (Plaid)

export { institutionsRouter };
