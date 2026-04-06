import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { generateConnectionPortalRouter } from "./generate-connection-portal";
import { snaptradeWebhookRouter } from "./webhook";

const snaptradeRouter = new OpenAPIHono();

// POST /webhook — no auth, called directly by SnapTrade
snaptradeRouter.route("/", snaptradeWebhookRouter);

// All other routes require auth
snaptradeRouter.use("/*", requireAuth);

// POST /generate-connection-portal → generate SnapTrade portal URL
snaptradeRouter.route("/", generateConnectionPortalRouter);

export { snaptradeRouter };
