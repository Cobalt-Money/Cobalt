import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";
import { activitiesRouter } from "./activities.js";
import { balancesRouter } from "./balances.js";
import { holdingsNewsRouter } from "./holdings-news.js";
import { mergedBundleRouter } from "./merged-bundle.js";
import { portfolioSnapshotsRouter } from "./portfolio-snapshots.js";
import { positionsRouter } from "./positions.js";
import { userBrokeragesRouter } from "./user-brokerages.js";
import { userTickersRouter } from "./user-tickers.js";

export const brokerageRouter = new OpenAPIHono()
  .use("/*", requirePaidUser)
  .route("/", mergedBundleRouter)
  .route("/", holdingsNewsRouter)
  .route("/", balancesRouter)
  .route("/", positionsRouter)
  .route("/", activitiesRouter)
  .route("/", portfolioSnapshotsRouter)
  .route("/", userBrokeragesRouter)
  .route("/", userTickersRouter);
