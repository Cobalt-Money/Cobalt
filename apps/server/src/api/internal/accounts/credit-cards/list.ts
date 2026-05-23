import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  creditCardsResponseSchema,
  getCreditCards,
} from "@cobalt-web/server-data/accounts/credit-cards/list";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "List the user's Plaid-connected credit card accounts.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/credit-cards",
  responses: {
    200: jsonContent(creditCardsResponseSchema, "List of credit cards"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List credit cards",
  tags: ["Accounts"],
});

export const creditCardsListRouter = createApp().openapi(route, async (c) => {
  const accounts = await getCreditCards(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(creditCardsResponseSchema.parse({ accounts }), 200);
});
