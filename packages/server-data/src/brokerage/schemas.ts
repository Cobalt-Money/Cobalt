import {
  brokerageActivities,
  brokerageBalances,
  brokeragePositions,
  portfolioSnapshots,
} from "@cobalt-web/db/schema/brokerage";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Error ───────────────────────────────────────────────────────────

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ── Balances ────────────────────────────────────────────────────────

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

// ── Positions ───────────────────────────────────────────────────────

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
    createdAt: z.string().nullable(),
    lastSync: z.string().nullable(),
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

// ── Activities ──────────────────────────────────────────────────────

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
    createdAt: z.string().nullable(),
    lastSync: z.string().nullable(),
    settlementDate: z.string().nullable(),
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

// ── Portfolio Snapshots ─────────────────────────────────────────────

const snapshotRowSchema = createSelectSchema(portfolioSnapshots);

/** Snapshot DTO: picked DB columns + renamed value fields (see `getPortfolioSnapshotsByUserId`). */
export const portfolioSnapshotItemSchema = snapshotRowSchema
  .pick({
    accountId: true,
    snapshotDate: true,
  })
  .extend({
    cash: z.number(),
    positions: z.number(),
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

// ── User Brokerages ─────────────────────────────────────────────────

export const userBrokeragesResponseSchema = z.object({
  data: z.array(z.string()),
});

// ── User Tickers ────────────────────────────────────────────────────

export const userTickersResponseSchema = z.object({
  tickers: z.array(z.string()),
});
