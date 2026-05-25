import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas.public";
import { transactionIdSchema } from "@cobalt-web/server-data/transactions/_shared/schema.public";
import { getTransactionDetail } from "@cobalt-web/server-data/transactions/detail";
import { setTransactionTags } from "@cobalt-web/server-data/transactions/tags/mutations";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { toTransaction, transactionResponseSchema } from "./_shared.js";

const setTransactionTagsSchema = z
  .object({
    tagIds: z.array(z.string()).openapi({
      description: "Full replacement set of tag ids. Pass `[]` to clear all tags.",
    }),
  })
  .openapi("TransactionTagsUpdate");

const route = createRoute({
  description:
    "Replace the set of tags on a transaction. Use `GET /v1/tags` to discover available tag ids.",
  method: "put",
  middleware: [requireApiKey] as const,
  operationId: "transactions_updateTags",
  path: "/transactions/{transactionId}/tags",
  request: {
    body: jsonContentRequired(setTransactionTagsSchema, "Tag ids to attach"),
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(transactionResponseSchema, "Updated transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(setTransactionTagsSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Set transaction tags",
  tags: ["Transactions"],
});

export const setTagsRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { transactionId } = c.req.valid("param");
  const { tagIds } = c.req.valid("json");
  // setTransactionTags silently no-ops on unowned/missing rows. Re-fetch
  // after to surface the 404 (and to return the new state).
  await setTransactionTags(user.id, transactionId, tagIds);
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
