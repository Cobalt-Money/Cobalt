import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getBrokerageAccounts,
  toBrokerageAccountListItem,
} from "@cobalt-web/server-data/brokerage/queries";
import { brokerageAccountsListResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const listRoute = createRoute({
  description:
    "SnapTrade-connected brokerage accounts only (Plaid investment accounts are listed via merged brokerage or bank account APIs).",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/brokerage",
  responses: {
    200: jsonContent(brokerageAccountsListResponseSchema, "Brokerage accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List SnapTrade brokerage accounts",
  tags: ["Accounts"],
});

export const brokerageSnaptradeRouter = createApp().openapi(listRoute, async (c) => {
  const accounts = await getBrokerageAccounts(c.var.user.id);
  const items = accounts.map(toBrokerageAccountListItem);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(brokerageAccountsListResponseSchema.parse({ accounts: items }), 200);
});
