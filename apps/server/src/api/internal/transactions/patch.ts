import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  assertCategoryOwned,
  successResponseSchema,
  transactionIdSchema,
} from "@cobalt-web/server-data/transactions/_shared";
import {
  patchTransaction,
  patchTransactionSchema,
} from "@cobalt-web/server-data/transactions/patch";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Sparse partial update — only fields present in the body are written. Pass `null` to restore the original value (RFC 7396 semantics). Writes to transaction_edit for auditing.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}",
  request: {
    body: {
      content: {
        "application/json": {
          schema: patchTransactionSchema,
        },
      },
    },
    params: transactionIdSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Transaction updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction, category, or tag not found"),
    422: validationErrorResponse(patchTransactionSchema),
  },
  summary: "Update a transaction",
  tags: ["Transactions"],
});

export const patchRouter = createApp().openapi(route, async (c) => {
  const { transactionId } = c.req.valid("param");
  const body = c.req.valid("json");
  if (body.categoryId) {
    await assertCategoryOwned(body.categoryId, c.var.user.id);
  }
  await patchTransaction(transactionId, c.var.user.id, body);
  return c.json({ success: true }, 200);
});
