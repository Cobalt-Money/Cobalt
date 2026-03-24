import { OpenAPIHono } from "@hono/zod-openapi";

import { requireAuth } from "../../middleware/auth.js";
import { bankAccountsRouter } from "./bank-accounts.js";
import { creditCardsRouter } from "./credit-cards.js";
import { plaidItemsRouter } from "./plaid-items.js";

export const accountsRouter = new OpenAPIHono()
  .use("/*", requireAuth)
  .route("/", bankAccountsRouter)
  .route("/", creditCardsRouter)
  .route("/", plaidItemsRouter);
