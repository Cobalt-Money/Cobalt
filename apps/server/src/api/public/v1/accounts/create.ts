import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { getAccountDetail } from "@cobalt-web/server-data/accounts/detail";
import { createManualAccount } from "@cobalt-web/server-data/accounts/manual/create";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { accountCreateRequestSchema, accountSchema, toInternalCreate } from "../schemas.js";

const responseSchema = accountSchema.openapi("AccountCreateResponse");

const route = createRoute({
  description:
    'Create a manual (non-bank-linked) account — bank, credit_card, investment, or loan — and seed today\'s balance snapshot. `subtype` must belong to the chosen `type` vocabulary (see schema). `creditLimit` only valid when `type === "credit_card"`. `currentBalance` is signed: positive for assets, negative for liabilities.',
  method: "post",
  middleware: [requireApiKey] as const,
  operationId: "accounts_create",
  path: "/accounts",
  request: { body: jsonContentRequired(accountCreateRequestSchema, "Account to create") },
  responses: {
    201: jsonContent(responseSchema, "Created account"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    422: validationErrorResponse(accountCreateRequestSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Create manual account",
  tags: ["Accounts"],
});

export const createRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const body = c.req.valid("json");
  const { id } = await createManualAccount(user.id, toInternalCreate(body));
  const row = await getAccountDetail(user.id, id);
  return c.json(responseSchema.parse(row), 201);
});
