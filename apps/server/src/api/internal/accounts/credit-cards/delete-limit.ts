import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema, successResponseSchema } from "@cobalt-web/server-data/accounts/_shared";
import { deleteCreditLimit } from "@cobalt-web/server-data/accounts/credit-cards/delete-limit";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Clear the user-override credit limit (revert to Plaid's reported value).",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/credit-cards/{id}/credit-limit",
  request: { params: accountIdSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Credit limit reset"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(accountIdSchema),
  },
  summary: "Reset credit limit override",
  tags: ["Accounts"],
});

export const creditCardsDeleteLimitRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  await deleteCreditLimit(id, c.var.user.id);
  return c.json(successResponseSchema.parse({ success: true }), 200);
});
