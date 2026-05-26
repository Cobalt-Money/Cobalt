import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  assertCategoryOwned,
  transactionIdSchema,
} from "@cobalt-web/server-data/transactions/_shared";
import { getTransactionDetail } from "@cobalt-web/server-data/transactions/detail";
import {
  patchTransaction,
  patchTransactionSchema,
} from "@cobalt-web/server-data/transactions/patch";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { toTransaction, transactionResponseSchema } from "./_shared.js";

const route = createRoute({
  description:
    "Sparse partial update — only fields present in the body are written. Pass `null` to restore the original (provider-derived) value. Returns the updated transaction.",
  method: "patch",
  middleware: [requireApiKey] as const,
  operationId: "transactions_update",
  path: "/transactions/{transactionId}",
  request: {
    body: jsonContentRequired(patchTransactionSchema, "Fields to update"),
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(transactionResponseSchema, "Updated transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction, category, or tag not found"),
    422: validationErrorResponse(patchTransactionSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Update transaction",
  tags: ["Transactions"],
});

export const patchRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { transactionId } = c.req.valid("param");
  const body = c.req.valid("json");
  try {
    if (body.categoryId) {
      await assertCategoryOwned(body.categoryId, user.id);
    }
    await patchTransaction(transactionId, user.id, body);
    const tx = await getTransactionDetail(user.id, transactionId);
    return c.json(transactionResponseSchema.parse(toTransaction(tx)), 200);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return c.json({ code: error.code, error: error.message }, 404);
    }
    throw error;
  }
});
