import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  bankAccountResponseSchema,
  getAccountDetail,
} from "@cobalt-web/server-data/accounts/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  description:
    "Single bank-shape account by internal id. Works for any source (Plaid, manual, snaptrade); Plaid-only fields are null for non-Plaid rows.",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}",
  request: { params: accountIdSchema },
  responses: {
    200: jsonContent(bankAccountResponseSchema, "Account details"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(accountIdSchema),
  },
  summary: "Get account details",
  tags: ["Accounts"],
});

export const detailRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const account = await getAccountDetail(c.var.user.id, id);
  c.header("Cache-Control", "private, max-age=60");
  return c.json(bankAccountResponseSchema.parse(account), 200);
});
