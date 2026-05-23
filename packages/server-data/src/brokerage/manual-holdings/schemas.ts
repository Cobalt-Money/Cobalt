import { z } from "@hono/zod-openapi";

export const createManualHoldingSchema = z
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
  .openapi("CreateManualHolding");

export const manualHoldingIdParamSchema = z.object({
  holdingId: z.uuid(),
});

export const patchManualHoldingSchema = z
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
  .openapi("PatchManualHolding");

export const setManualCashSleeveSchema = z
  .object({
    accountId: z.uuid(),
    amount: z.number().nonnegative(),
  })
  .openapi("SetManualCashSleeve");

export const sellManualHoldingSchema = z
  .object({
    holdingId: z.uuid(),
    sellPrice: z.number().nonnegative(),
    sellQuantity: z.number().positive(),
    soldAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .openapi("SellManualHolding");

export const manualHoldingResponseSchema = z
  .object({
    accountId: z.uuid(),
    averagePrice: z.string().nullable(),
    costBasis: z.string().nullable(),
    currency: z.string().nullable(),
    id: z.uuid(),
    institutionPrice: z.string().nullable(),
    institutionPriceAsOf: z.string().nullable(),
    institutionValue: z.string().nullable(),
    quantity: z.string(),
    securityId: z.uuid(),
    ticker: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("ManualHolding");

export type CreateManualHolding = z.infer<typeof createManualHoldingSchema>;
export type PatchManualHolding = z.infer<typeof patchManualHoldingSchema>;
export type SetManualCashSleeve = z.infer<typeof setManualCashSleeveSchema>;
export type SellManualHolding = z.infer<typeof sellManualHoldingSchema>;
export type ManualHoldingResponse = z.infer<typeof manualHoldingResponseSchema>;

// Backwards-compatible aliases for existing external consumers.
export const sellManualHoldingBodySchema = sellManualHoldingSchema;
export type SellManualHoldingBody = SellManualHolding;
