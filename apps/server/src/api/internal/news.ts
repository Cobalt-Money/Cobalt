import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "./middleware";
import { eventDetailRouter } from "./news/event-detail";
import { eventsRouter } from "./news/events";
import { forYouRouter } from "./news/for-you";
import { rssRouter } from "./news/rss";
import { trendingRouter } from "./news/trending";

const newsRouter = new OpenAPIHono();

newsRouter.use("/*", requirePaidUser);

// GET /events          → paginated financial events
// GET /events/for-you  → personalized events based on holdings
// GET /events/:eventId → single event detail
// GET /trending        → trending headlines
// GET /rss             → RSS feed articles (filtered by company/category)

newsRouter.route("/", eventsRouter);
newsRouter.route("/", forYouRouter);
newsRouter.route("/", eventDetailRouter);
newsRouter.route("/", rssRouter);
newsRouter.route("/", trendingRouter);

export { newsRouter };
