import { patchTransaction } from "@cobalt-web/server-data/transactions/mutations";
import {
  successResponse,
  transactionIdParamSchema,
  transactionPatchBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

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
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Transaction updated",
    },
  },
  summary: "Update a transaction",
  tags: ["Transactions"],
});

export const overridesRouter = new OpenAPIHono<AppEnv>().openapi(
  patchTransactionRoute,
  async (c) => {
    const { transactionId } = c.req.valid("param");
    const body = c.req.valid("json");
    await patchTransaction(transactionId, c.var.user.id, body);
    return c.json({ success: true }, 200);
  }
);
