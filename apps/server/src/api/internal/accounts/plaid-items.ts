import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getPlaidAccountsForItem,
  getPlaidItemsWithAlerts,
  getUserPlaidItems,
} from "@cobalt-web/server-data/accounts/queries";
import {
  itemIdParamSchema,
  plaidAccountsForItemResponseSchema,
  plaidItemAlertListResponseSchema,
  plaidItemListResponseSchema,
} from "@cobalt-web/server-data/accounts/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const listAccountsForItem = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/items/{itemId}",
  request: { params: itemIdParamSchema },
  responses: {
    200: jsonContent(plaidAccountsForItemResponseSchema, "Accounts for Plaid item"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Plaid item not found"),
    422: validationErrorResponse(itemIdParamSchema),
  },
  summary: "Get accounts for a Plaid item",
  tags: ["Accounts"],
});

const listItems = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/plaid-items",
  responses: {
    200: jsonContent(plaidItemListResponseSchema, "List of Plaid items"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List Plaid items",
  tags: ["Accounts"],
});

const listAlerts = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/plaid-items/alerts",
  responses: {
    200: jsonContent(plaidItemAlertListResponseSchema, "Plaid items needing attention"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List Plaid item alerts",
  tags: ["Accounts"],
});

const plaidItemsRouter = createApp()
  .openapi(listAccountsForItem, async (c) => {
    const { itemId } = c.req.valid("param");
    const accounts = await getPlaidAccountsForItem(c.var.user.id, itemId);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ accounts }, 200);
  })
  .openapi(listItems, async (c) => {
    const items = await getUserPlaidItems(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ items }, 200);
  })
  .openapi(listAlerts, async (c) => {
    const alerts = await getPlaidItemsWithAlerts(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ alerts }, 200);
  });

export { plaidItemsRouter };
