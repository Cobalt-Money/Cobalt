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
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requireAuth } from "../middleware.js";

const listAccountsForItem = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/items/{itemId}",
  request: { params: itemIdParamSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: plaidAccountsForItemResponseSchema },
      },
      description: "Accounts for Plaid item",
    },
  },
  summary: "Get accounts for a Plaid item",
  tags: ["Accounts"],
});

const listItems = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/plaid-items",
  responses: {
    200: {
      content: {
        "application/json": { schema: plaidItemListResponseSchema },
      },
      description: "List of Plaid items",
    },
  },
  summary: "List Plaid items",
  tags: ["Accounts"],
});

const listAlerts = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/plaid-items/alerts",
  responses: {
    200: {
      content: {
        "application/json": { schema: plaidItemAlertListResponseSchema },
      },
      description: "Plaid items needing attention",
    },
  },
  summary: "List Plaid item alerts",
  tags: ["Accounts"],
});

const plaidItemsRouter = new OpenAPIHono<AppEnv>()
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
