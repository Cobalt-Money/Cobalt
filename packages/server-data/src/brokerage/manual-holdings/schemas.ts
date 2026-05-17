import { z } from "@hono/zod-openapi";

export const createManualHoldingBodySchema = z
  .object({
    accountId: z.string(),
    costBasis: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional().openapi({ example: "USD" }),
    institutionPrice: z.number().nonnegative(),
    institutionPriceAsOf: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    name: z.string().min(1).max(255).optional(),
    quantity: z.number().positive(),
    ticker: z.string().min(1).max(32),
  })
  .openapi("CreateManualHoldingBody");

export const updateManualHoldingParamsSchema = z.object({
  holdingId: z.uuid(),
});

export const updateManualHoldingBodySchema = z
  .object({
    costBasis: z.number().nonnegative().nullable().optional(),
    institutionPrice: z.number().nonnegative().optional(),
    institutionPriceAsOf: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    quantity: z.number().positive().optional(),
  })
  .openapi("UpdateManualHoldingBody");

export const setManualCashSleeveBodySchema = z
  .object({
    accountId: z.uuid(),
    amount: z.number().nonnegative(),
  })
  .openapi("SetManualCashSleeveBody");

export const manualHoldingCreatedSchema = z
  .object({
    holdingId: z.uuid(),
  })
  .openapi("ManualHoldingCreated");

export const okSchema = z.object({ ok: z.literal(true) }).openapi("Ok");

export type CreateManualHoldingBody = z.infer<typeof createManualHoldingBodySchema>;
export type UpdateManualHoldingBody = z.infer<typeof updateManualHoldingBodySchema>;
export type SetManualCashSleeveBody = z.infer<typeof setManualCashSleeveBodySchema>;
