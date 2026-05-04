import { z } from "@hono/zod-openapi";

import { successResponseSchema } from "../accounts/schemas.js";

// ── Error ───────────────────────────────────────────────────────────

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ── Balances / positions / activities (flat list DTOs) ─────────────

/**
 * Balance wire DTO. Sourced from `balance` (accounts/balance) joined with
 * `financialAccount` for the SnapTrade external id; legacy `accountId` (text)
 * now corresponds to `financialAccount.externalId` (with `source='snaptrade'`),
 * and the legacy `snapTradeAccountId` is the same external id.
 */
export const balanceItemSchema = z.object({
  accountId: z.string(),
  buyingPower: z.union([z.number(), z.string()]).nullable(),
  cash: z.union([z.number(), z.string()]).nullable(),
  createdAt: z.string().nullable(),
  currencyCode: z.string().nullable(),
  currencyName: z.string().nullable(),
  id: z.string(),
  lastSync: z.string().nullable(),
  snapTradeAccountId: z.string().nullable(),
  updatedAt: z.string().nullable(),
  userId: z.string(),
});

export const balancesResponseSchema = z.object({
  balances: z.array(balanceItemSchema),
  balancesByAccount: z.record(z.string(), z.array(balanceItemSchema)),
});

/**
 * Position wire DTO. Sourced from `holding` (accounts/holding); SnapTrade-only
 * symbol/exchange metadata is preserved on the wire even though the new schema
 * normalizes it through the `security` table.
 */
export const positionItemSchema = z.object({
  accountId: z.string(),
  averagePurchasePrice: z.union([z.number(), z.string()]).nullable(),
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
  openPnl: z.union([z.number(), z.string()]).nullable(),
  price: z.union([z.number(), z.string()]).nullable(),
  rawSymbol: z.string().nullable(),
  securityTypeCode: z.string().nullable(),
  securityTypeDescription: z.string().nullable(),
  securityTypeId: z.string().nullable(),
  snapTradeAccountId: z.string().nullable(),
  symbol: z.string().nullable(),
  symbolDescription: z.string().nullable(),
  symbolId: z.string().nullable(),
  units: z.union([z.number(), z.string()]).nullable(),
  updatedAt: z.string().nullable(),
  userId: z.string(),
});

export const positionsQuerySchema = z.object({
  accountId: z.string().optional(),
  limit: z.coerce.number().min(1).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const positionsResponseSchema = z.object({
  positions: z.array(positionItemSchema),
  positionsByAccount: z.record(z.string(), z.array(positionItemSchema)),
});

/**
 * Activity wire DTO. Sourced from `investmentActivity` (accounts/investment-activity).
 * Legacy `activityId` maps to `externalId`; legacy `fee` → `fees`; legacy
 * `tradeDate` → `date`. The wire shape here is preserved for backward
 * compatibility with existing clients.
 */
export const activityItemSchema = z.object({
  accountId: z.string(),
  activityId: z.string().nullable(),
  amount: z.union([z.number(), z.string()]).nullable(),
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
  fee: z.union([z.number(), z.string()]).nullable(),
  figiCode: z.string().nullable(),
  fxRate: z.union([z.number(), z.string()]).nullable(),
  id: z.string(),
  institution: z.string().nullable(),
  lastSync: z.string().nullable(),
  optionSymbol: z.unknown().nullable(),
  optionType: z.string().nullable(),
  pagination: z.unknown().nullable(),
  price: z.union([z.number(), z.string()]).nullable(),
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
  units: z.union([z.number(), z.string()]).nullable(),
  updatedAt: z.string().nullable(),
  userId: z.string(),
});

export const activitiesQuerySchema = z.object({
  accountId: z.string().optional(),
  limit: z.coerce.number().min(1).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const activitiesResponseSchema = z.object({
  activities: z.array(activityItemSchema),
  activitiesByAccount: z.record(z.string(), z.array(activityItemSchema)),
});

/**
 * Snapshot DTO. Sourced from `snapshot` (accounts/snapshot); `cash` /
 * `positions` / `value` correspond to the coerced `current - positions_value` /
 * `positions_value` / `current` columns surfaced by snapshot queries.
 */
export const portfolioSnapshotItemSchema = z.object({
  accountId: z.string(),
  cash: z.number(),
  positions: z.number(),
  snapshotDate: z.string(),
  value: z.number(),
});

export const portfolioSnapshotsQuerySchema = z.object({
  accountId: z.string().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const portfolioSnapshotsResponseSchema = z.object({
  snapshots: z.array(portfolioSnapshotItemSchema),
});

export const userBrokeragesResponseSchema = z.object({
  data: z.array(z.string()),
});

export const userTickersResponseSchema = z.object({
  tickers: z.array(z.string()),
});

// ── Enhanced brokerage account (grouped balances + Plaid-adapted) ──

/**
 * Nested balance line on merged / list account payloads.
 * Sourced from `balance`; wire uses string ISO dates + string|number decimals.
 */
export const enhancedAccountBalanceLineSchema = z.object({
  buyingPower: z.union([z.number(), z.string()]).nullable(),
  cash: z.union([z.number(), z.string()]).nullable(),
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
  balance: z.union([z.number(), z.string()]).nullable(),
  id: z.string(),
  lastSync: z.string().nullable(),
});

/**
 * UI account shape. Sourced from `financialAccount` (accounts/account);
 * synthetic `id` is still used for Plaid investment accounts (`plaid-inv-*`).
 * `accountStatus`, `accountType`, `balanceData`, `cashRestrictions`
 * are preserved on the wire even where the new schema folds them into
 * different columns (e.g. `status`, `type`).
 */
export const enhancedBrokerageAccountSchema = z.object({
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
});

// ── Brokerage accounts (list / disconnect) ─────────────────────────

export const brokerageAccountListItemSchema = enhancedBrokerageAccountSchema
  .pick({
    accountDetails: true,
    accountStatus: true,
    accountType: true,
    balances: true,
    id: true,
    institutionName: true,
    name: true,
  })
  .extend({
    plaidAccountId: z.string().optional(),
    source: z.enum(["plaid", "snaptrade"]).optional(),
  });

export const brokerageAccountsListResponseSchema = z.object({
  accounts: z.array(brokerageAccountListItemSchema),
});

export const disconnectBrokerageAccountResponseSchema = successResponseSchema.extend({
  message: z.string(),
});

export const brokerageAccountIdParamSchema = z.object({
  accountId: z.string().uuid(),
});
