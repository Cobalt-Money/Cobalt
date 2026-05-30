import { OpenAPIHono } from "@hono/zod-openapi";

import { brokerageRouter } from "./brokerage.js";
import { detailRouter } from "./detail.js";
import { disconnectRouter } from "./disconnect.js";
import { listRouter } from "./list.js";
import { manualCreateRouter } from "./manual/create.js";
import { manualSeedSnapshotRouter } from "./manual/seed-snapshot.js";
import { patchRouter } from "./patch.js";
import { plaidItemsAccountsRouter } from "./plaid-items/accounts.js";
import { plaidItemsAlertsRouter } from "./plaid-items/alerts.js";
import { plaidItemsListRouter } from "./plaid-items/list.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const accountsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", disconnectRouter)
  .route("/", plaidItemsListRouter)
  .route("/", plaidItemsAlertsRouter)
  .route("/", plaidItemsAccountsRouter)
  .route("/", brokerageRouter)
  .route("/", manualSeedSnapshotRouter)
  .route("/", manualCreateRouter)
  .route("/", detailRouter)
  .route("/", patchRouter);
