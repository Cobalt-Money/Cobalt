import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { disconnectBankConnection } from "@cobalt-web/server-data/accounts/mutations";
import { getBankAccountById, getBankAccounts } from "@cobalt-web/server-data/accounts/queries";
import {
  accountIdParamSchema,
  bankAccountDetailResponseSchema,
  bankAccountListResponseSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/accounts/schemas";
import { removeItem } from "@cobalt-web/server-data/providers/plaid/link/actions";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const list = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/",
  responses: {
    200: jsonContent(bankAccountListResponseSchema, "List of bank accounts"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "List bank accounts",
  tags: ["Accounts"],
});

const detail = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/bank/{id}",
  request: { params: accountIdParamSchema },
  responses: {
    200: jsonContent(bankAccountDetailResponseSchema, "Bank account details"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(accountIdParamSchema),
  },
  summary: "Get bank account details",
  tags: ["Accounts"],
});

const disconnect = createRoute({
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/bank/{id}",
  request: { params: accountIdParamSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Account disconnected"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Plaid connection in invalid state"),
    422: validationErrorResponse(accountIdParamSchema),
  },
  summary: "Disconnect bank account",
  tags: ["Accounts"],
});

const bankAccountsRouter = createApp()
  .openapi(list, async (c) => {
    const accounts = await getBankAccounts(c.var.user.id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json({ accounts }, 200);
  })
  .openapi(detail, async (c) => {
    const { id } = c.req.valid("param");
    const account = await getBankAccountById(c.var.user.id, id);
    c.header("Cache-Control", "private, max-age=60");
    return c.json(account, 200);
  })
  .openapi(disconnect, async (c) => {
    const { id } = c.req.valid("param");
    const result = await disconnectBankConnection(c.var.user.id, id);
    if (result.accessToken) {
      // Best-effort upstream cleanup; failure here doesn't undo local disconnect.
      try {
        await removeItem(result.accessToken);
      } catch (error) {
        console.warn("[disconnectBank] Plaid itemRemove failed", error);
      }
    }
    return c.json({ message: result.message, success: result.success }, 200);
  });

export { bankAccountsRouter };
