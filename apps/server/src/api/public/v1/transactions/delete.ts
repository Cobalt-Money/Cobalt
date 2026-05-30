import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  successResponseSchema,
  transactionIdSchema,
} from "@cobalt-web/server-data/transactions/_shared";
import { deleteTransaction } from "@cobalt-web/server-data/transactions/delete";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";

const route = createRoute({
  description:
    "Delete a manual transaction. Idempotent — returns success even if the transaction is already gone or is provider-managed (Plaid/SnapTrade).",
  method: "delete",
  middleware: [requireApiKey] as const,
  operationId: "transactions_delete",
  path: "/transactions/{transactionId}",
  request: {
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Transaction deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "Delete transaction",
  tags: ["Transactions"],
});

export const deleteRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { transactionId } = c.req.valid("param");
  await deleteTransaction(user.id, transactionId);
  return c.json({ success: true }, 200);
});
