import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  getTransactionDetail,
  transactionResponseSchema,
} from "@cobalt-web/server-data/transactions/detail";
import { transactionIdSchema } from "@cobalt-web/server-data/transactions/_shared";
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
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(transactionResponseSchema, "Transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdSchema),
  },
  summary: "Get transaction by id",
  tags: ["Transactions"],
});

export const detailRouter = createApp().openapi(getTransactionRoute, async (c) => {
  const { transactionId } = c.req.valid("param");
  const result = await getTransactionDetail(c.var.user.id, transactionId);
  return c.json(transactionResponseSchema.parse(result), 200);
});
