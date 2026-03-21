import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware/auth.js";

const newsRouter = new OpenAPIHono();

newsRouter.use("/*", requireAuth);

// GET /events          → paginated financial events
// GET /events/for-you  → personalized events based on holdings
// GET /events/:eventId → single event detail
// GET /trending        → trending headlines
// GET /rss             → RSS feed articles (filtered by company/category)

export { newsRouter };
