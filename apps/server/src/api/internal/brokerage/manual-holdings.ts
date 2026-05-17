import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  createManualHolding,
  deleteManualHolding,
  setManualCashSleeve,
  updateManualHolding,
} from "@cobalt-web/server-data/brokerage/manual-holdings/mutations";
import {
  createManualHoldingBodySchema,
  manualHoldingCreatedSchema,
  okSchema,
  setManualCashSleeveBodySchema,
  updateManualHoldingBodySchema,
  updateManualHoldingParamsSchema,
} from "@cobalt-web/server-data/brokerage/manual-holdings/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const createRouteDef = createRoute({
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/manual-holdings",
  request: {
    body: {
      content: { "application/json": { schema: createManualHoldingBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(manualHoldingCreatedSchema, "Holding created"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(createManualHoldingBodySchema),
  },
  summary: "Create a manual holding on a manual investment account",
  tags: ["Brokerage"],
});

const updateRouteDef = createRoute({
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/manual-holdings/{holdingId}",
  request: {
    body: {
      content: { "application/json": { schema: updateManualHoldingBodySchema } },
      required: true,
    },
    params: updateManualHoldingParamsSchema,
  },
  responses: {
    200: jsonContent(okSchema, "Holding updated"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Holding not found"),
    422: validationErrorResponse(updateManualHoldingBodySchema),
  },
  summary: "Update a manual holding (sparse patch)",
  tags: ["Brokerage"],
});

const deleteRouteDef = createRoute({
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/manual-holdings/{holdingId}",
  request: { params: updateManualHoldingParamsSchema },
  responses: {
    200: jsonContent(okSchema, "Holding deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Holding not found"),
    422: validationErrorResponse(updateManualHoldingParamsSchema),
  },
  summary: "Delete a manual holding",
  tags: ["Brokerage"],
});

const cashSleeveRouteDef = createRoute({
  method: "put",
  middleware: [requirePaidUser] as const,
  path: "/manual-cash-sleeve",
  request: {
    body: {
      content: { "application/json": { schema: setManualCashSleeveBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(okSchema, "Cash sleeve set"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(setManualCashSleeveBodySchema),
  },
  summary: "Set the uninvested cash sleeve on a manual investment account",
  tags: ["Brokerage"],
});

export const manualHoldingsRouter = createApp()
  .openapi(createRouteDef, async (c) => {
    const body = c.req.valid("json");
    const { holdingId } = await createManualHolding(c.var.user.id, body);
    return c.json({ holdingId }, 200);
  })
  .openapi(updateRouteDef, async (c) => {
    const { holdingId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateManualHolding(c.var.user.id, holdingId, body);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(deleteRouteDef, async (c) => {
    const { holdingId } = c.req.valid("param");
    await deleteManualHolding(c.var.user.id, holdingId);
    return c.json({ ok: true as const }, 200);
  })
  .openapi(cashSleeveRouteDef, async (c) => {
    const { accountId, amount } = c.req.valid("json");
    await setManualCashSleeve(c.var.user.id, accountId, amount);
    return c.json({ ok: true as const }, 200);
  });
