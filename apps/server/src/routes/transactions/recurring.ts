import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { getRecurringStreams } from "../../db/transactions.js";
import type { AppEnv } from "../../lib/types.js";
import { recurringStreamSchema } from "./schemas.js";

const route = createRoute({
  description:
    "Active recurring transaction streams (subscriptions, bills, income)",
  method: "get",
  path: "/recurring",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ streams: z.array(recurringStreamSchema) }),
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
