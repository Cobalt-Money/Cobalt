import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getPlaidItems,
  plaidItemsResponseSchema,
} from "@cobalt-web/server-data/accounts/plaid-items/list";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "List the user's Plaid items (bank connections).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/plaid-items",
  responses: {
    200: jsonContent(plaidItemsResponseSchema, "List of Plaid items"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List Plaid items",
  tags: ["Accounts"],
});

export const plaidItemsListRouter = createApp().openapi(route, async (c) => {
  const items = await getPlaidItems(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(plaidItemsResponseSchema.parse({ items }), 200);
});
