import { OpenAPIHono } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware";
import { activitiesRouter } from "./activities";
import { balancesRouter } from "./balances";
import { holdingsNewsRouter } from "./holdings-news";
import { mergedBundleRouter } from "./merged-bundle";
import { portfolioSnapshotsRouter } from "./portfolio-snapshots";
import { positionsRouter } from "./positions";
import { userBrokeragesRouter } from "./user-brokerages";
import { userTickersRouter } from "./user-tickers";

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
