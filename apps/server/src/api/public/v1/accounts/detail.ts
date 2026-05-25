import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import { getAccountDetail } from "@cobalt-web/server-data/accounts/detail";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { accountSchema } from "../schemas.js";

const accountResponseSchema = z.object({ data: accountSchema }).openapi("AccountDetail");

const route = createRoute({
  description: "Fetch a single account by identifier.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "accounts_get",
  path: "/accounts/{id}",
  request: { params: accountIdSchema },
  responses: {
    200: jsonContent(accountResponseSchema, "Account detail"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(accountIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Get account",
  tags: ["Accounts"],
});

export const detailRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const { id } = c.req.valid("param");
  try {
    const row = await getAccountDetail(user.id, id);
    return c.json(accountResponseSchema.parse({ data: row }), 200);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return c.json({ code: "account_not_found", error: "Account not found" }, 404);
    }
    throw error;
  }
});
