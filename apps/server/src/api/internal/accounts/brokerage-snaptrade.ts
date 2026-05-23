import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getBrokerageAccounts,
  toBrokerageAccountListItem,
} from "@cobalt-web/server-data/brokerage/queries";
import {
  brokerageAccountIdParamSchema,
  brokerageAccountsListResponseSchema,
  disconnectBrokerageAccountResponseSchema,
} from "@cobalt-web/server-data/brokerage/schemas";
import { disconnectBrokerageAccountByUserId } from "@cobalt-web/server-data/providers/snaptrade/disconnect";
import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
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

const deleteRoute = createRoute({
  description:
    "Disconnect a SnapTrade brokerage account (removes authorization, accounts, and related snapshots).",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/brokerage/{accountId}",
  request: { params: brokerageAccountIdParamSchema },
  responses: {
    200: jsonContent(disconnectBrokerageAccountResponseSchema, "Disconnect result"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Brokerage account not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Account is not a SnapTrade brokerage"),
    422: validationErrorResponse(brokerageAccountIdParamSchema),
    502: jsonContent(errorResponseWithCodeSchema, "SnapTrade upstream failure"),
  },
  summary: "Disconnect SnapTrade brokerage account",
  tags: ["Accounts"],
});

export const brokerageSnaptradeRouter = createApp()
  .openapi(listRoute, async (c) => {
    const accounts = await getBrokerageAccounts(c.var.user.id);
    const items = accounts.map(toBrokerageAccountListItem);
    c.header("Cache-Control", "private, max-age=60");
    return c.json(brokerageAccountsListResponseSchema.parse({ accounts: items }), 200);
  })
  .openapi(deleteRoute, async (c) => {
    const entitled = await userHasActiveSubscription(c.var.user.id);
    if (!entitled) {
      throw new ApiError(403, "subscription_required", "Subscription required");
    }

    const { accountId } = c.req.valid("param");
    const result = await disconnectBrokerageAccountByUserId(c.var.user.id, accountId);
    return c.json(result, 200);
  });
