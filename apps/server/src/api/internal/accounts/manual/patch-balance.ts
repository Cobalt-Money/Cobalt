import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { accountIdSchema, successResponseSchema } from "@cobalt-web/server-data/accounts/_shared";
import {
  patchManualBalance,
  patchManualBalanceSchema,
} from "@cobalt-web/server-data/accounts/manual/patch-balance";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description:
    "Set `balance.current` for a manual account directly. Caller-controlled sign — value is written verbatim. Re-snapshots so net-worth views update immediately.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{id}/balance",
  request: {
    body: jsonContentRequired(patchManualBalanceSchema, "New balance"),
    params: accountIdSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Balance updated"),
    400: jsonContent(errorResponseWithCodeSchema, "Account is not manual"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(patchManualBalanceSchema),
  },
  summary: "Patch manual account balance",
  tags: ["Accounts"],
});

export const manualPatchBalanceRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  await patchManualBalance(c.var.user.id, id, body);
  return c.json(successResponseSchema.parse({ message: "ok", success: true }), 200);
});
