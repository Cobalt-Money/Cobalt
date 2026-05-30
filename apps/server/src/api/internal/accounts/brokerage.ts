import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getBrokerageAccounts,
  toBrokerageAccountListItem,
} from "@cobalt-web/server-data/brokerage/queries";
import { brokerageAccountsListResponseSchema } from "@cobalt-web/server-data/brokerage/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const querySchema = z.object({
  source: z.enum(["snaptrade", "plaid", "manual", "all"]).optional(),
});

const listRoute = createRoute({
  description:
    "All brokerage-shaped accounts: SnapTrade, Plaid investment, and manual investment. Inspect `source` on each item to distinguish. SnapTrade-only fields (`snaptradeAuthorizationId`, `needsReauth`) are null/false for non-SnapTrade rows. Use `?source=` to filter (default: `all`).",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/brokerage",
  request: { query: querySchema },
  responses: {
    200: jsonContent(brokerageAccountsListResponseSchema, "Brokerage accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List brokerage accounts",
  tags: ["Accounts"],
});

export const brokerageRouter = createApp().openapi(listRoute, async (c) => {
  const { source } = c.req.valid("query");
  const accounts = await getBrokerageAccounts(c.var.user.id);
  const filtered =
    !source || source === "all" ? accounts : accounts.filter((a) => a.source === source);
  const items = filtered.map(toBrokerageAccountListItem);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(brokerageAccountsListResponseSchema.parse({ accounts: items }), 200);
});
