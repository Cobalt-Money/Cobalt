import { z } from "@hono/zod-openapi";

/**
 * Balance wire DTO. Sourced from `balance` (accounts/balance) joined with
 * `financialAccount` for the SnapTrade external id.
 */
export const balanceItemSchema = z
  .object({
    accountId: z.string(),
    buyingPower: z.string().nullable(),
    cash: z.string().nullable(),
    createdAt: z.string().nullable(),
    currencyCode: z.string().nullable(),
    currencyName: z.string().nullable(),
    id: z.string(),
    lastSync: z.string().nullable(),
    snapTradeAccountId: z.string().nullable(),
    updatedAt: z.string().nullable(),
    userId: z.string(),
  })
  .openapi("BrokerageBalance");

export const balancesResponseSchema = z.object({
  balances: z.array(balanceItemSchema),
  balancesByAccount: z.record(z.string(), z.array(balanceItemSchema)),
});

export type BalanceItem = z.infer<typeof balanceItemSchema>;
export type BalancesResponse = z.infer<typeof balancesResponseSchema>;
