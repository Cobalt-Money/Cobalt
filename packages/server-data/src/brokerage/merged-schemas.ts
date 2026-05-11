import { z } from "@hono/zod-openapi";

import {
  eventsQuerySchema,
  eventsResponseSchema,
  mappedFinancialEventSchema,
} from "../news/events/schemas.js";
import {
  activitiesResponseSchema,
  balancesResponseSchema,
  enhancedBrokerageAccountSchema,
  portfolioSnapshotItemSchema,
  portfolioSnapshotsQuerySchema,
  positionsResponseSchema,
} from "./schemas.js";

export const holdingsNewsItemSchema = mappedFinancialEventSchema.openapi("HoldingsNewsItem");

const mappedFinancialEventsList = z.array(holdingsNewsItemSchema);

// ── Merged brokerage bundle (SnapTrade tables + adapted Plaid data) ─

export const mergedBrokerageQuerySchema = portfolioSnapshotsQuerySchema
  .pick({
    endDate: true,
    startDate: true,
  })
  .extend({
    activitiesLimit: z.coerce.number().min(1).max(500).optional(),
    positionsLimit: z.coerce.number().min(1).max(500).optional(),
  });

export const mergedBrokerageDataSchema = balancesResponseSchema
  .extend(activitiesResponseSchema.shape)
  .extend(positionsResponseSchema.shape)
  .extend({
    accounts: z.array(enhancedBrokerageAccountSchema),
    holdingsNews: mappedFinancialEventsList,
    portfolioSnapshots: z.array(portfolioSnapshotItemSchema),
    userBrokerages: z.array(z.string()),
  })
  .openapi("BrokerageData");

// ── Holdings news (financial events for holding tickers) ───────────

export const holdingsNewsQuerySchema = eventsQuerySchema
  .pick({
    limit: true,
  })
  .extend({
    limit: z.coerce.number().min(1).max(50).default(8),
  });

export const holdingsNewsResponseSchema = eventsResponseSchema
  .pick({
    events: true,
  })
  .extend({
    news: mappedFinancialEventsList,
  })
  .omit({
    events: true,
  });
