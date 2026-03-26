import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "./middleware.js";

const brokerageRouter = new OpenAPIHono();

brokerageRouter.use("/*", requireAuth);

// GET /                    → full brokerage data (accounts, balances, positions, activities, snapshots)
// GET /balances            → account balances
// GET /positions           → positions (optionally by account)
// GET /activities          → trade activities (optionally by account)
// GET /user-brokerages     → list of connected brokerage names
// GET /user-tickers        → list of held tickers
// GET /portfolio-snapshots → historical portfolio snapshots
// GET /holdings-news       → news for held positions

export { brokerageRouter };
