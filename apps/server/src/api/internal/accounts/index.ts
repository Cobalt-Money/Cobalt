import { OpenAPIHono } from "@hono/zod-openapi";

import { bankAccountsRouter } from "./bank-accounts.js";
import { brokerageSnaptradeRouter } from "./brokerage-snaptrade.js";
import { creditCardsRouter } from "./credit-cards.js";
import { manualAccountsRouter } from "./manual-accounts.js";
import { plaidItemsRouter } from "./plaid-items.js";

// requireAuth applied per-route via createRoute middleware (see chain contract in apps/server/src/index.ts)
export const accountsRouter = new OpenAPIHono()
  .route("/", bankAccountsRouter)
  .route("/", creditCardsRouter)
  .route("/", plaidItemsRouter)
  .route("/", brokerageSnaptradeRouter)
  .route("/", manualAccountsRouter);
