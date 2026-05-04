import { getTransactionActivity } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionActivityResponseSchema,
  transactionIdParamSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const getActivityRoute = createRoute({
  description: "Ordered list of edit events for a transaction (oldest first).",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}/activity",
  request: {
    params: transactionIdParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: transactionActivityResponseSchema },
      },
      description: "Transaction activity",
    },
  },
  summary: "Get transaction activity",
  tags: ["Transactions"],
});

export const activityRouter = new OpenAPIHono<AppEnv>().openapi(getActivityRoute, async (c) => {
  const { transactionId } = c.req.valid("param");
  const events = await getTransactionActivity(transactionId);
  return c.json({ events }, 200);
});
