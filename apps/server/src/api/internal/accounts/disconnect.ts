import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  disconnectAccount,
  disconnectBankAccountResponseSchema,
} from "@cobalt-web/server-data/accounts/disconnect";
import { removeItem } from "@cobalt-web/server-data/providers/plaid/link/actions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Disconnect an account by `financial_account.id`. Source-agnostic — server dispatches on row.source (plaid/snaptrade/manual). For Plaid, if no accounts remain under the item, also calls Plaid's `/item/remove`.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{id}",
  request: { params: accountIdSchema },
  responses: {
    200: jsonContent(disconnectBankAccountResponseSchema, "Account disconnected"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Provider connection in invalid state"),
    422: validationErrorResponse(accountIdSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Upstream provider failure"),
  },
  summary: "Disconnect account",
  tags: ["Accounts"],
});

export const disconnectRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const result = await disconnectAccount(c.var.user.id, id);
  if (result.accessToken) {
    // Best-effort upstream cleanup; failure here doesn't undo local disconnect.
    try {
      await removeItem(result.accessToken);
    } catch (error) {
      console.warn("[disconnectAccount] Plaid itemRemove failed", error);
    }
  }
  return c.json(
    disconnectBankAccountResponseSchema.parse({
      message: result.message,
      success: result.success,
    }),
    200,
  );
});
