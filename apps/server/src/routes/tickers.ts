import { OpenAPIHono } from "@hono/zod-openapi";

const tickersRouter = new OpenAPIHono();

// Public routes — no auth required
// TODO: Port from horizon-test
// GET /search         → search tickers
// GET /:symbol/price  → get ticker price

export { tickersRouter };
