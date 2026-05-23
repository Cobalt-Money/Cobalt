import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/brokerage/_shared";
import {
  createManualHolding,
  createManualHoldingSchema,
  deleteManualHolding,
  getManualHoldingDetail,
  manualHoldingIdParamSchema,
  manualHoldingResponseSchema,
  patchManualHoldingSchema,
  sellManualHolding,
  sellManualHoldingSchema,
  setManualCashSleeve,
  setManualCashSleeveSchema,
  updateManualHolding,
} from "@cobalt-web/server-data/brokerage/manual-holdings";
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
      content: { "application/json": { schema: createManualHoldingSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(manualHoldingResponseSchema, "Holding created"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(createManualHoldingSchema),
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
      content: { "application/json": { schema: patchManualHoldingSchema } },
      required: true,
    },
    params: manualHoldingIdParamSchema,
  },
  responses: {
    200: jsonContent(manualHoldingResponseSchema, "Holding updated"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Holding not found"),
    422: validationErrorResponse(patchManualHoldingSchema),
  },
  summary: "Update a manual holding (sparse patch)",
  tags: ["Brokerage"],
});

const deleteRouteDef = createRoute({
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/manual-holdings/{holdingId}",
  request: { params: manualHoldingIdParamSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Holding deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Holding not found"),
    422: validationErrorResponse(manualHoldingIdParamSchema),
  },
  summary: "Delete a manual holding",
  tags: ["Brokerage"],
});

const sellRouteDef = createRoute({
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/manual-holdings/sell",
  request: {
    body: {
      content: { "application/json": { schema: sellManualHoldingSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(successResponseSchema, "Sell recorded"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input or oversell"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Holding not found"),
    422: validationErrorResponse(sellManualHoldingSchema),
  },
  summary: "Record a SELL against a manual holding",
  tags: ["Brokerage"],
});

const cashSleeveRouteDef = createRoute({
  method: "put",
  middleware: [requirePaidUser] as const,
  path: "/manual-cash-sleeve",
  request: {
    body: {
      content: { "application/json": { schema: setManualCashSleeveSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(successResponseSchema, "Cash sleeve set"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid input"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Account not found"),
    422: validationErrorResponse(setManualCashSleeveSchema),
  },
  summary: "Set the uninvested cash sleeve on a manual investment account",
  tags: ["Brokerage"],
});

export const manualHoldingsRouter = createApp()
  .openapi(createRouteDef, async (c) => {
    const body = c.req.valid("json");
    const { holdingId } = await createManualHolding(c.var.user.id, body);
    const created = await getManualHoldingDetail(c.var.user.id, holdingId);
    return c.json(manualHoldingResponseSchema.parse(created), 200);
  })
  .openapi(updateRouteDef, async (c) => {
    const { holdingId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateManualHolding(c.var.user.id, holdingId, body);
    const updated = await getManualHoldingDetail(c.var.user.id, holdingId);
    return c.json(manualHoldingResponseSchema.parse(updated), 200);
  })
  .openapi(deleteRouteDef, async (c) => {
    const { holdingId } = c.req.valid("param");
    await deleteManualHolding(c.var.user.id, holdingId);
    return c.json(successResponseSchema.parse({ success: true }), 200);
  })
  .openapi(sellRouteDef, async (c) => {
    const body = c.req.valid("json");
    await sellManualHolding(c.var.user.id, body);
    return c.json(successResponseSchema.parse({ success: true }), 200);
  })
  .openapi(cashSleeveRouteDef, async (c) => {
    const { accountId, amount } = c.req.valid("json");
    await setManualCashSleeve(c.var.user.id, accountId, amount);
    return c.json(successResponseSchema.parse({ success: true }), 200);
  });
