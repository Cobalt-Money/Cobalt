import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getBrokerageAccounts,
  toBrokerageAccountListItem,
} from "@cobalt-web/server-data/brokerage/queries";
import { brokerageAccountsListResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";

const querySchema = z.object({
  source: z.enum(["snaptrade", "plaid", "manual", "all"]).optional().openapi({
    description: "Filter by account origin. Default `all`.",
  }),
});

const route = createRoute({
  description:
    "All brokerage-shaped accounts (SnapTrade, Plaid investment, manual investment). Inspect `source` on each item to distinguish. SnapTrade-only fields (`snaptradeAuthorizationId`, `needsReauth`) are null/false for non-SnapTrade rows.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "accounts_brokerage_list",
  path: "/accounts/brokerage",
  request: { query: querySchema },
  responses: {
    200: jsonContent(brokerageAccountsListResponseSchema, "Brokerage accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List brokerage accounts",
  tags: ["Accounts"],
});

export const brokerageRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { source } = c.req.valid("query");
  const accounts = await getBrokerageAccounts(user.id);
  const filtered =
    !source || source === "all" ? accounts : accounts.filter((a) => a.source === source);
  const items = filtered.map(toBrokerageAccountListItem);
  return c.json(brokerageAccountsListResponseSchema.parse({ accounts: items }), 200);
});
