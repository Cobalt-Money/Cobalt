import { getTransactionActivity } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionActivityResponseSchema,
  transactionIdParamSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
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
    200: jsonContent(transactionActivityResponseSchema, "Transaction activity"),
    422: validationErrorResponse(transactionIdParamSchema),
  },
  summary: "Get transaction activity",
  tags: ["Transactions"],
});

export const activityRouter = createApp().openapi(getActivityRoute, async (c) => {
  const { transactionId } = c.req.valid("param");
  const events = await getTransactionActivity(transactionId);
  return c.json({ events }, 200);
});
