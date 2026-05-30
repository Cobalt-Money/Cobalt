import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  bankAccountResponseSchema,
  getAccountDetail,
} from "@cobalt-web/server-data/accounts/detail";
import { patchAccount, patchAccountSchema } from "@cobalt-web/server-data/accounts/patch";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const route = createRoute({
  description:
    "Partial update to an account by internal id. Currently supports user-override `creditLimit` (positive magnitude; null clears the override). Source-agnostic.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{id}",
  request: {
    body: { content: { "application/json": { schema: patchAccountSchema } } },
    params: accountIdSchema,
  },
  responses: {
    200: jsonContent(bankAccountResponseSchema, "Updated account"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(patchAccountSchema),
  },
  summary: "Update account",
  tags: ["Accounts"],
});

export const patchRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const patch = c.req.valid("json");
  await patchAccount(c.var.user.id, id, patch);
  const updated = await getAccountDetail(c.var.user.id, id);
  return c.json(bankAccountResponseSchema.parse(updated), 200);
});
