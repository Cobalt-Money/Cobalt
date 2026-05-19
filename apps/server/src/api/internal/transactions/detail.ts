import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getTransactionById } from "@cobalt-web/server-data/transactions/queries";
import {
  transactionIdParamSchema,
  transactionListItemSchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const getTransactionRoute = createRoute({
  description: "Single transaction with joined account, institution, category, and tag ids.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}",
  request: {
    params: transactionIdParamSchema,
  },
  responses: {
    200: jsonContent(transactionListItemSchema, "Transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdParamSchema),
  },
  summary: "Get transaction by id",
  tags: ["Transactions"],
});

export const detailRouter = createApp().openapi(getTransactionRoute, async (c) => {
  const { transactionId } = c.req.valid("param");
  const result = await getTransactionById(c.var.user.id, transactionId);
  return c.json(result, 200);
});
