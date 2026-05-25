import { getRecurringTransactions } from "@cobalt-web/server-data/recurring/query";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireApiKey } from "./middleware/require-api-key.js";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { recurringStreamSchema } from "./schemas.js";

const recurringStreamsResponseSchema = z
  .object({ data: z.array(recurringStreamSchema) })
  .openapi("RecurringStreamList");

const route = createRoute({
  description:
    "Detected recurring streams — subscriptions, bills, and recurring deposits. Only active streams are returned.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "recurring_list",
  path: "/recurring",
  responses: {
    200: jsonContent(recurringStreamsResponseSchema, "Recurring streams"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List recurring streams",
  tags: ["Recurring"],
});

export const recurringRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const rows = await getRecurringTransactions(user.id);
  return c.json(
    recurringStreamsResponseSchema.parse({
      data: rows.map((r) => ({
        accountId: r.accountId,
        averageAmount: r.averageAmount,
        category: r.category
          ? {
              excludeFromInsights: null,
              groupId: null,
              hidden: null,
              iconKey: r.category.iconKey,
              id: r.category.id,
              name: r.category.name,
              systemKey: r.category.systemKey,
            }
          : null,
        description: r.description ?? null,
        firstDate: r.firstDate ?? null,
        frequency: r.frequency,
        id: r.id,
        isActive: r.isActive,
        lastAmount: r.lastAmount,
        lastDate: r.lastDate ?? null,
        merchantName: r.merchantName ?? null,
        predictedNextDate: r.predictedNextDate ?? null,
        status: r.status ?? null,
        streamType: r.streamType ?? null,
      })),
    }),
    200,
  );
});
