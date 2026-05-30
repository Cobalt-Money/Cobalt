import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import { disconnectAccount } from "@cobalt-web/server-data/accounts/disconnect";
import { removeItem } from "@cobalt-web/server-data/providers/plaid/link/actions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";

const route = createRoute({
  description:
    "Delete an account by id. Source-agnostic: manual accounts are removed outright, Plaid-linked accounts are unlinked (and Plaid's `/item/remove` is called once the item drains), and SnapTrade brokerage accounts are disconnected upstream.",
  method: "delete",
  middleware: [requireApiKey] as const,
  operationId: "accounts_delete",
  path: "/accounts/{id}",
  request: { params: accountIdSchema },
  responses: {
    204: { description: "Account deleted" },
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Account cannot be deleted via this endpoint"),
    422: validationErrorResponse(accountIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Delete account",
  tags: ["Accounts"],
});

export const deleteRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { id } = c.req.valid("param");
  try {
    const result = await disconnectAccount(user.id, id);
    if (result.accessToken) {
      try {
        await removeItem(result.accessToken);
      } catch (error) {
        console.warn("[accounts_delete] Plaid itemRemove failed", error);
      }
    }
    return c.body(null, 204);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return c.json({ code: error.code, error: error.message }, 404);
      }
      if (error.status === 409) {
        return c.json({ code: error.code, error: error.message }, 409);
      }
    }
    throw error;
  }
});
