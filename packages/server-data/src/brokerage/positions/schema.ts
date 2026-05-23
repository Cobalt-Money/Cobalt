import { z } from "@hono/zod-openapi";

/**
 * Position wire DTO. Sourced from `holding` (accounts/holding); SnapTrade-only
 * symbol/exchange metadata is preserved on the wire.
 */
export const positionItemSchema = z
  .object({
    accountId: z.string(),
    averagePurchasePrice: z.string().nullable(),
    createdAt: z.string().nullable(),
    currencyCode: z.string().nullable(),
    currencyId: z.string().nullable(),
    currencyName: z.string().nullable(),
    exchangeCode: z.string().nullable(),
    exchangeId: z.string().nullable(),
    exchangeMicCode: z.string().nullable(),
    exchangeName: z.string().nullable(),
    figiCode: z.string().nullable(),
    id: z.string(),
    isQuotable: z.boolean().nullable(),
    isTradable: z.boolean().nullable(),
    lastSync: z.string().nullable(),
    localId: z.string().nullable(),
    openPnl: z.string().nullable(),
    price: z.string().nullable(),
    rawSymbol: z.string().nullable(),
    securityTypeCode: z.string().nullable(),
    securityTypeDescription: z.string().nullable(),
    securityTypeId: z.string().nullable(),
    snapTradeAccountId: z.string().nullable(),
    symbol: z.string().nullable(),
    symbolDescription: z.string().nullable(),
    symbolId: z.string().nullable(),
    units: z.string().nullable(),
    updatedAt: z.string().nullable(),
    userId: z.string(),
  })
  .openapi("BrokeragePosition");

export const positionsQuerySchema = z.object({
  accountId: z.string().optional(),
  limit: z.coerce.number().min(1).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const positionsResponseSchema = z.object({
  positions: z.array(positionItemSchema),
  positionsByAccount: z.record(z.string(), z.array(positionItemSchema)),
});

export type PositionItem = z.infer<typeof positionItemSchema>;
export type PositionsQuery = z.infer<typeof positionsQuerySchema>;
export type PositionsResponse = z.infer<typeof positionsResponseSchema>;
