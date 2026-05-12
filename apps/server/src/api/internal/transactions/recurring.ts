import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getRecurringStreams } from "@cobalt-web/server-data/transactions/queries";
import { recurringStreamsResponseSchema } from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Active recurring transaction streams (subscriptions, bills, income)",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/recurring",
  responses: {
    200: jsonContent(recurringStreamsResponseSchema, "Recurring streams"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List recurring transactions",
  tags: ["Transactions"],
});

export const recurringRouter = createApp().openapi(route, async (c) => {
  const streams = await getRecurringStreams(c.var.user.id);
  return c.json({ streams }, 200);
});
