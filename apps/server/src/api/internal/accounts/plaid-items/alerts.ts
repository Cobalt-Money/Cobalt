import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getPlaidItemAlerts,
  plaidItemAlertsResponseSchema,
} from "@cobalt-web/server-data/accounts/plaid-items/alerts";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Plaid items needing reauth or pending disconnect.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/plaid-items/alerts",
  responses: {
    200: jsonContent(plaidItemAlertsResponseSchema, "Plaid items needing attention"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List Plaid item alerts",
  tags: ["Accounts"],
});

export const plaidItemsAlertsRouter = createApp().openapi(route, async (c) => {
  const alerts = await getPlaidItemAlerts(c.var.user.id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(plaidItemAlertsResponseSchema.parse({ alerts }), 200);
});
