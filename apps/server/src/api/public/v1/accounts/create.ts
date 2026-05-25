import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getAccountDetail } from "@cobalt-web/server-data/accounts/detail";
import {
  createManualAccount,
  createManualAccountSchema,
} from "@cobalt-web/server-data/accounts/manual/create";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { accountSchema } from "../schemas.js";

const responseSchema = z.object({ data: accountSchema }).openapi("AccountCreateResponse");

const route = createRoute({
  description:
    'Create a manual (non-bank-linked) account — checking, savings, credit, brokerage, or loan — and seed today\'s balance snapshot. `subtype` must belong to the chosen `type` vocabulary (see schema). `creditLimit` only valid when `type === "credit"`.',
  method: "post",
  middleware: [requireApiKey] as const,
  operationId: "accounts_create",
  path: "/accounts",
  request: { body: jsonContentRequired(createManualAccountSchema, "Account to create") },
  responses: {
    201: jsonContent(responseSchema, "Created account"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    422: validationErrorResponse(createManualAccountSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Create manual account",
  tags: ["Accounts"],
});

export const createRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const body = c.req.valid("json");
  const { id } = await createManualAccount(user.id, body);
  const row = await getAccountDetail(user.id, id);
  return c.json(responseSchema.parse({ data: row }), 201);
});
