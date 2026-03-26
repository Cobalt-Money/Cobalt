import { getRecurringStreams } from "@cobalt-web/server-data/transactions/queries";
import { recurringStreamsResponseSchema } from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const route = createRoute({
  description:
    "Active recurring transaction streams (subscriptions, bills, income)",
  method: "get",
  path: "/recurring",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: recurringStreamsResponseSchema,
        },
      },
      description: "Recurring streams",
    },
  },
  summary: "List recurring transactions",
  tags: ["Transactions"],
});

export const recurringRouter = new OpenAPIHono<AppEnv>().openapi(
  route,
  async (c) => {
    const streams = await getRecurringStreams(c.var.user.id);
    return c.json({ streams }, 200);
  }
);
