import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertCategoryOwned } from "@cobalt-web/server-data/transactions/errors";
import { patchTransaction } from "@cobalt-web/server-data/transactions/mutations";
import {
  successResponse,
  transactionIdParamSchema,
  transactionPatchBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import { getTagIdsForTransaction } from "@cobalt-web/server-data/transactions/tags/queries";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const patchTransactionRoute = createRoute({
  description:
    "Sparse partial update — only fields present in the body are written. Pass `null` to restore the original value (RFC 7396 semantics). Writes to transaction_edit for auditing.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}",
  request: {
    body: {
      content: {
        "application/json": {
          schema: transactionPatchBodySchema,
        },
      },
    },
    params: transactionIdParamSchema,
  },
  responses: {
    200: jsonContent(successResponse, "Transaction updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction, category, or tag not found"),
    422: validationErrorResponse(transactionPatchBodySchema),
  },
  summary: "Update a transaction",
  tags: ["Transactions"],
});

const getTransactionTagsRoute = createRoute({
  description: "Returns the ids of every tag attached to a transaction.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}/tags",
  request: { params: transactionIdParamSchema },
  responses: {
    200: jsonContent(z.object({ tagIds: z.array(z.uuid()) }), "Tag ids on this transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdParamSchema),
  },
  summary: "List tags on a transaction",
  tags: ["Transactions"],
});

export const overridesRouter = createApp()
  .openapi(patchTransactionRoute, async (c) => {
    const { transactionId } = c.req.valid("param");
    const body = c.req.valid("json");
    if (body.categoryId) {
      await assertCategoryOwned(body.categoryId, c.var.user.id);
    }
    await patchTransaction(transactionId, c.var.user.id, body);
    return c.json({ success: true }, 200);
  })
  .openapi(getTransactionTagsRoute, async (c) => {
    const { transactionId } = c.req.valid("param");
    const tagIds = await getTagIdsForTransaction(c.var.user.id, transactionId);
    return c.json({ tagIds }, 200);
  });
