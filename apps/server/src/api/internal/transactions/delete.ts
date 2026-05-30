import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  successResponseSchema,
  transactionIdSchema,
} from "@cobalt-web/server-data/transactions/_shared";
import { deleteTransaction } from "@cobalt-web/server-data/transactions/delete";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Delete a manual transaction. Idempotent — no error if already gone or not manual.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}",
  request: {
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Transaction deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "Delete a transaction",
  tags: ["Transactions"],
});

export const deleteRouter = createApp().openapi(route, async (c) => {
  const { transactionId } = c.req.valid("param");
  await deleteTransaction(c.var.user.id, transactionId);
  return c.json({ success: true }, 200);
});
