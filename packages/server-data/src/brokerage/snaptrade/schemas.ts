import {
  brokerageAccountDetails,
  brokerageAccounts,
  brokerageActivities,
  brokerageBalances,
  brokeragePositions,
  portfolioSnapshots,
} from "@cobalt-web/db/schema/brokerage";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

import { successResponseSchema } from "../../accounts/schemas.js";

// ── Error ───────────────────────────────────────────────────────────

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ── Balances / positions / activities (flat list DTOs) ─────────────

const balanceRowSchema = createSelectSchema(brokerageBalances);

export const balanceItemSchema = balanceRowSchema
  .pick({
    accountId: true,
    buyingPower: true,
    cash: true,
    currencyCode: true,
    currencyName: true,
    id: true,
    snapTradeAccountId: true,
    userId: true,
  })
  .extend({
    createdAt: z.string().nullable(),
    lastSync: z.string().nullable(),
    updatedAt: z.string().nullable(),
  });

export const balancesResponseSchema = z.object({
  balances: z.array(balanceItemSchema),
  balancesByAccount: z.record(z.string(), z.array(balanceItemSchema)),
});

const positionRowSchema = createSelectSchema(brokeragePositions);

export const positionItemSchema = positionRowSchema
  .pick({
    accountId: true,
    averagePurchasePrice: true,
    currencyCode: true,
    currencyId: true,
    currencyName: true,
    exchangeCode: true,
    exchangeId: true,
    exchangeMicCode: true,
    exchangeName: true,
    figiCode: true,
    id: true,
    isQuotable: true,
    isTradable: true,
    localId: true,
    openPnl: true,
    price: true,
    rawSymbol: true,
    securityTypeCode: true,
    securityTypeDescription: true,
    securityTypeId: true,
    snapTradeAccountId: true,
    symbol: true,
    symbolDescription: true,
    symbolId: true,
    units: true,
    userId: true,
  })
  .extend({
    accountId: z.string(),
    createdAt: z.string().nullable(),
    lastSync: z.string().nullable(),
    snapTradeAccountId: z.string().nullable(),
    updatedAt: z.string().nullable(),
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

const activityRowSchema = createSelectSchema(brokerageActivities);

export const activityItemSchema = activityRowSchema
  .pick({
    accountId: true,
    activityId: true,
    amount: true,
    currencyCode: true,
    currencyId: true,
    currencyName: true,
    description: true,
    exchangeCode: true,
    exchangeId: true,
    exchangeMicCode: true,
    exchangeName: true,
    externalReferenceId: true,
    fee: true,
    figiCode: true,
    fxRate: true,
    id: true,
    institution: true,
    optionSymbol: true,
    optionType: true,
    pagination: true,
    price: true,
    rawSymbol: true,
    securityTypeCode: true,
    securityTypeDescription: true,
    securityTypeId: true,
    snapTradeAccountId: true,
    symbol: true,
    symbolDescription: true,
    symbolId: true,
    symbolTicker: true,
    type: true,
    units: true,
    userId: true,
  })
  .extend({
    accountId: z.string(),
    activityId: z.string().nullable(),
    createdAt: z.string().nullable(),
    lastSync: z.string().nullable(),
    optionSymbol: z.unknown().nullable(),
    pagination: z.unknown().nullable(),
    settlementDate: z.string().nullable(),
    snapTradeAccountId: z.string().nullable(),
    symbol: z.unknown().nullable(),
    tradeDate: z.string().nullable(),
    updatedAt: z.string().nullable(),
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

const snapshotRowSchema = createSelectSchema(portfolioSnapshots);

/**
 * Snapshot DTO: `accountId` + `snapshotDate` from `portfolio_snapshot`;
 * `cash` / `positions` / `value` match coerced `cash_value` / `positions_value` / `total_value` in `getPortfolioSnapshotsByUserId`.
 */
export const portfolioSnapshotItemSchema = snapshotRowSchema
  .pick({
    accountId: true,
    snapshotDate: true,
  })
  .extend({
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

// ── Enhanced brokerage account (SnapTrade grouped + Plaid-adapted) ──

const brokerageAccountRowSchema = createSelectSchema(brokerageAccounts);
const accountDetailRowSchema = createSelectSchema(brokerageAccountDetails);

/**
 * Nested balance line on merged / list account payloads.
 * Picked from `brokerage_balance`; wire uses string ISO dates + string|number decimals.
 */
export const enhancedAccountBalanceLineSchema = balanceRowSchema
  .pick({
    buyingPower: true,
    cash: true,
    currencyCode: true,
    currencyName: true,
    id: true,
    lastSync: true,
  })
  .extend({
    buyingPower: z.union([z.number(), z.string()]).nullable(),
    cash: z.union([z.number(), z.string()]).nullable(),
    lastSync: z.string().nullable(),
  });

/** Picked from `brokerage_account_detail` balance + id + lastSync; `balance` is jsonb on DB. */
export const enhancedAccountDetailSchema = accountDetailRowSchema
  .pick({
    balance: true,
    id: true,
    lastSync: true,
  })
  .extend({
    balance: z.union([z.number(), z.string()]).nullable(),
    lastSync: z.string().nullable(),
  });

/**
 * UI account shape: picked `brokerage_account` columns + synthetic `id` for Plaid (`plaid-inv-*`).
 */
export const enhancedBrokerageAccountSchema = brokerageAccountRowSchema
  .pick({
    accountStatus: true,
    accountType: true,
    balanceData: true,
    cashRestrictions: true,
    institutionName: true,
    name: true,
    portfolioGroup: true,
    userId: true,
  })
  .extend({
    accountDetails: enhancedAccountDetailSchema.nullable(),
    balances: z.array(enhancedAccountBalanceLineSchema),
    createdDate: z.string(),
    id: z.string(),
  });

// ── SnapTrade brokerage accounts (list / disconnect) ───────────────

export const snaptradeBrokerageAccountListItemSchema =
  enhancedBrokerageAccountSchema
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

export const snaptradeBrokerageAccountsListResponseSchema = z.object({
  accounts: z.array(snaptradeBrokerageAccountListItemSchema),
});

export const disconnectBrokerageAccountResponseSchema =
  successResponseSchema.extend({
    message: z.string(),
  });

export const brokerageAccountIdParamSchema = z.object({
  accountId: z.string().uuid(),
});
