import { OpenAPIHono } from "@hono/zod-openapi";

import { eventDetailRouter } from "./event-detail.js";
import { eventsRouter } from "./events.js";
import { forYouRouter } from "./for-you.js";
import { rssRouter } from "./rss.js";
import { trendingRouter } from "./trending.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
//
// GET /events          → paginated financial events
// GET /events/for-you  → personalized events based on holdings
// GET /events/:eventId → single event detail
// GET /trending        → trending headlines
// GET /rss             → RSS feed articles (filtered by company/category)
export const newsRouter = new OpenAPIHono()
  .route("/", eventsRouter)
  .route("/", forYouRouter)
  .route("/", eventDetailRouter)
  .route("/", rssRouter)
  .route("/", trendingRouter);
