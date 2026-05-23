import { z } from "@hono/zod-openapi";

export { errorResponseSchema } from "../../_shared/schemas.js";

export const successResponseSchema = z.object({ success: z.boolean() });

export const brokerageAccountIdParamSchema = z.object({
  accountId: z.string().uuid(),
});

/**
 * Nested balance line on merged / list account payloads.
 * Sourced from `balance`; wire uses string ISO dates + string|number decimals.
 */
export const enhancedAccountBalanceLineSchema = z.object({
  buyingPower: z.string().nullable(),
  cash: z.string().nullable(),
  currencyCode: z.string().nullable(),
  currencyName: z.string().nullable(),
  id: z.string(),
  lastSync: z.string().nullable(),
});

/**
 * Detail block on enhanced account payloads. Previously sourced from
 * `brokerage_account_detail`; the merged `financialAccount` exposes a single
 * `balance` value plus `lastSyncAt`.
 */
export const enhancedAccountDetailSchema = z.object({
  balance: z.string().nullable(),
  id: z.string(),
  lastSync: z.string().nullable(),
});

/**
 * UI account shape. Sourced from `financialAccount` (accounts/account);
 * synthetic `id` is still used for Plaid investment accounts (`plaid-inv-*`).
 */
export const enhancedBrokerageAccountSchema = z
  .object({
    accountDetails: enhancedAccountDetailSchema.nullable(),
    accountStatus: z.string().nullable(),
    accountType: z.string().nullable(),
    balanceData: z.unknown().nullable(),
    balances: z.array(enhancedAccountBalanceLineSchema),
    cashRestrictions: z.unknown().nullable(),
    createdDate: z.string(),
    id: z.string(),
    institutionName: z.string().nullable(),
    name: z.string().nullable(),
    userId: z.string(),
  })
  .openapi("BrokerageAccount");

export interface EnhancedBrokerageAccount {
  accountDetails: {
    balance: string | null;
    id: string;
    lastSync: string | null;
  } | null;
  accountStatus: string | null;
  accountType: string | null;
  balanceData: unknown;
  balances: {
    buyingPower: string | null;
    cash: string | null;
    currencyCode: string | null;
    currencyName: string | null;
    id: string;
    lastSync: string | null;
  }[];
  cashRestrictions: unknown;
  createdDate: string;
  id: string;
  institutionName: string | null;
  name: string | null;
  userId: string;
}
