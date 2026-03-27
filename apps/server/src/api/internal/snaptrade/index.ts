import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";
import { generateConnectionPortalRouter } from "./generate-connection-portal.js";

const snaptradeRouter = new OpenAPIHono();

snaptradeRouter.use("/*", requireAuth);

// POST /generate-connection-portal → generate SnapTrade portal URL
snaptradeRouter.route("/", generateConnectionPortalRouter);

// POST /webhook — blocked on workflow infrastructure migration
// Reference: .sandbox/horizon-test/app/api/snaptrade/webhook/route.ts

export { snaptradeRouter };
