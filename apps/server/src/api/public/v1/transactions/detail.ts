import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { transactionIdSchema } from "@cobalt-web/server-data/transactions/_shared/schema.public";
import { getTransactionDetail } from "@cobalt-web/server-data/transactions/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { toTransaction, transactionResponseSchema } from "./_shared.js";

const route = createRoute({
  description: "Fetch a single transaction by identifier.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "transactions_get",
  path: "/transactions/{transactionId}",
  request: { params: transactionIdSchema },
  responses: {
    200: jsonContent(transactionResponseSchema, "Transaction detail"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Get transaction",
  tags: ["Transactions"],
});

export const detailRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { transactionId } = c.req.valid("param");
  try {
    const tx = await getTransactionDetail(user.id, transactionId);
    return c.json(transactionResponseSchema.parse({ data: toTransaction(tx) }), 200);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return c.json({ code: "transaction_not_found", error: "Transaction not found" }, 404);
    }
    throw error;
  }
});
