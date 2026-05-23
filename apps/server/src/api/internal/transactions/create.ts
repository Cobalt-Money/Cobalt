import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  createManualTransactions,
  createTransactionSchema,
} from "@cobalt-web/server-data/transactions/create";
import {
  getTransactionDetail,
  transactionResponseSchema,
} from "@cobalt-web/server-data/transactions/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    'Create a single manual transaction on a user-owned manual account. Server stamps `source: "manual"`, `pending: false`, and `userId`. Use `id` to pre-bind the row for optimistic UI flows.',
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTransactionSchema,
        },
      },
    },
  },
  responses: {
    200: jsonContent(transactionResponseSchema, "Transaction created"),
    400: jsonContent(errorResponseWithCodeSchema, "Account is not manual"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(createTransactionSchema),
  },
  summary: "Create a transaction",
  tags: ["Transactions"],
});

export const createRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  const {
    ids: [id],
  } = await createManualTransactions(c.var.user.id, [body]);
  if (!id) {
    throw new Error("createManualTransactions returned no id");
  }
  const created = await getTransactionDetail(c.var.user.id, id);
  return c.json(transactionResponseSchema.parse(created), 200);
});
