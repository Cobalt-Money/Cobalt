import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../middleware";
import { bankAccountsRouter } from "./bank-accounts";
import { brokerageSnaptradeRouter } from "./brokerage-snaptrade";
import { creditCardsRouter } from "./credit-cards";
import { plaidItemsRouter } from "./plaid-items";

export const accountsRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", bankAccountsRouter)
  .route("/", creditCardsRouter)
  .route("/", plaidItemsRouter)
  .route("/", brokerageSnaptradeRouter);
