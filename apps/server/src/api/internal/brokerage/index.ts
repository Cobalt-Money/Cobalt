import { OpenAPIHono } from "@hono/zod-openapi";

import { activitiesRouter } from "./activities.js";
import { balancesRouter } from "./balances.js";
import { holdingsNewsRouter } from "./holdings-news.js";
import { manualHoldingsRouter } from "./manual-holdings.js";
import { mergedBundleRouter } from "./merged-bundle.js";
import { portfolioSnapshotsRouter } from "./portfolio-snapshots.js";
import { positionsRouter } from "./positions.js";
import { userBrokeragesRouter } from "./user-brokerages.js";
import { userTickersRouter } from "./user-tickers.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const brokerageRouter = new OpenAPIHono()
  .route("/", mergedBundleRouter)
  .route("/", holdingsNewsRouter)
  .route("/", balancesRouter)
  .route("/", positionsRouter)
  .route("/", activitiesRouter)
  .route("/", portfolioSnapshotsRouter)
  .route("/", userBrokeragesRouter)
  .route("/", userTickersRouter)
  .route("/", manualHoldingsRouter);
