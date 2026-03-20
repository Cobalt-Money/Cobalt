import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const researchRouter = new OpenAPIHono();

researchRouter.use("/*", requireAuth);

// TODO: Port from horizon-test
// GET /quote         → current price + change
// GET /overview      → company overview (Alpha Vantage)
// GET /chart         → price history (1D/1W/1M/3M/6M/YTD/1Y/All)
// GET /earnings      → earnings history + estimates
// GET /income        → income statement
// GET /balance-sheet → balance sheet
// GET /news          → ticker-specific news

export { researchRouter };
