import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { plaidItemIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  getAccountsForPlaidItem,
  plaidAccountsForItemResponseSchema,
} from "@cobalt-web/server-data/accounts/plaid-items/accounts";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Accounts under a single Plaid item (bank connection).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/items/{itemId}",
  request: { params: plaidItemIdSchema },
  responses: {
    200: jsonContent(plaidAccountsForItemResponseSchema, "Accounts for Plaid item"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Plaid item not found"),
    422: validationErrorResponse(plaidItemIdSchema),
  },
  summary: "Get accounts for a Plaid item",
  tags: ["Accounts"],
});

export const plaidItemsAccountsRouter = createApp().openapi(route, async (c) => {
  const { itemId } = c.req.valid("param");
  const accounts = await getAccountsForPlaidItem(c.var.user.id, itemId);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(plaidAccountsForItemResponseSchema.parse({ accounts }), 200);
});
