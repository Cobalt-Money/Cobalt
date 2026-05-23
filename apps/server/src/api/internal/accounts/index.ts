import { OpenAPIHono } from "@hono/zod-openapi";

import { brokerageSnaptradeRouter } from "./brokerage-snaptrade.js";
import { creditCardsDeleteLimitRouter } from "./credit-cards/delete-limit.js";
import { creditCardsListRouter } from "./credit-cards/list.js";
import { creditCardsPatchLimitRouter } from "./credit-cards/patch-limit.js";
import { detailRouter } from "./detail.js";
import { disconnectRouter } from "./disconnect.js";
import { listRouter } from "./list.js";
import { manualSeedSnapshotRouter } from "./manual/seed-snapshot.js";
import { plaidItemsAccountsRouter } from "./plaid-items/accounts.js";
import { plaidItemsAlertsRouter } from "./plaid-items/alerts.js";
import { plaidItemsListRouter } from "./plaid-items/list.js";

// requirePaidUser applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const accountsRouter = new OpenAPIHono()
  .route("/", listRouter)
  .route("/", detailRouter)
  .route("/", disconnectRouter)
  .route("/", creditCardsListRouter)
  .route("/", creditCardsPatchLimitRouter)
  .route("/", creditCardsDeleteLimitRouter)
  .route("/", plaidItemsListRouter)
  .route("/", plaidItemsAlertsRouter)
  .route("/", plaidItemsAccountsRouter)
  .route("/", brokerageSnaptradeRouter)
  .route("/", manualSeedSnapshotRouter);
