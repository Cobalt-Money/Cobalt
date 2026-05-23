import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { transactionIdSchema } from "@cobalt-web/server-data/transactions/_shared";
import {
  getTagsForTransaction,
  transactionTagsResponseSchema,
} from "@cobalt-web/server-data/transactions/tags";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description: "Returns every tag attached to a transaction.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}/tags",
  request: { params: transactionIdSchema },
  responses: {
    200: jsonContent(transactionTagsResponseSchema, "Tags on this transaction"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Transaction not found"),
    422: validationErrorResponse(transactionIdSchema),
  },
  summary: "List tags on a transaction",
  tags: ["Transactions"],
});

export const tagsRouter = createApp().openapi(route, async (c) => {
  const { transactionId } = c.req.valid("param");
  const tags = await getTagsForTransaction(c.var.user.id, transactionId);
  return c.json(transactionTagsResponseSchema.parse({ tags }), 200);
});
