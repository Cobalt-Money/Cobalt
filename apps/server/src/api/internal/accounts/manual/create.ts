import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  createManualAccount,
  createManualAccountResponseSchema,
  createManualAccountSchema,
} from "@cobalt-web/server-data/accounts/manual/create";
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
    'Create a manual (non-bank-linked) account and seed today\'s balance snapshot. Mirrors the Zero `m.accounts.createAccount` mutator. `subtype` must belong to the chosen `type` vocabulary. `creditLimit` only valid when `type === "credit"`. `currentBalance` is signed: positive for assets, negative for liabilities.',
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/manual",
  request: { body: jsonContentRequired(createManualAccountSchema, "Account to create") },
  responses: {
    201: jsonContent(createManualAccountResponseSchema, "Created account id"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(createManualAccountSchema),
  },
  summary: "Create manual account",
  tags: ["Accounts"],
});

export const manualCreateRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  const result = await createManualAccount(c.var.user.id, body);
  return c.json(createManualAccountResponseSchema.parse(result), 201);
});
