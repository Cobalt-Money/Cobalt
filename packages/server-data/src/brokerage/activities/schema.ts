import { z } from "@hono/zod-openapi";

/**
 * Activity wire DTO. Sourced from `investmentActivity` (accounts/investment-activity).
 */
export const activityItemSchema = z
  .object({
    accountId: z.string(),
    activityId: z.string().nullable(),
    amount: z.string().nullable(),
    createdAt: z.string().nullable(),
    currencyCode: z.string().nullable(),
    currencyId: z.string().nullable(),
    currencyName: z.string().nullable(),
    description: z.string().nullable(),
    exchangeCode: z.string().nullable(),
    exchangeId: z.string().nullable(),
    exchangeMicCode: z.string().nullable(),
    exchangeName: z.string().nullable(),
    externalReferenceId: z.string().nullable(),
    fee: z.string().nullable(),
    figiCode: z.string().nullable(),
    fxRate: z.string().nullable(),
    id: z.string(),
    institution: z.string().nullable(),
    lastSync: z.string().nullable(),
    optionSymbol: z.unknown().nullable(),
    optionType: z.string().nullable(),
    pagination: z.unknown().nullable(),
    price: z.string().nullable(),
    rawSymbol: z.string().nullable(),
    securityTypeCode: z.string().nullable(),
    securityTypeDescription: z.string().nullable(),
    securityTypeId: z.string().nullable(),
    settlementDate: z.string().nullable(),
    snapTradeAccountId: z.string().nullable(),
    symbol: z.unknown().nullable(),
    symbolDescription: z.string().nullable(),
    symbolId: z.string().nullable(),
    symbolTicker: z.string().nullable(),
    tradeDate: z.string().nullable(),
    type: z.string().nullable(),
    units: z.string().nullable(),
    updatedAt: z.string().nullable(),
    userId: z.string(),
  })
  .openapi("BrokerageActivity");

export const activitiesQuerySchema = z.object({
  accountId: z.string().optional(),
  limit: z.coerce.number().min(1).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const activitiesResponseSchema = z.object({
  activities: z.array(activityItemSchema),
  activitiesByAccount: z.record(z.string(), z.array(activityItemSchema)),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ActivitiesQuery = z.infer<typeof activitiesQuerySchema>;
export type ActivitiesResponse = z.infer<typeof activitiesResponseSchema>;
