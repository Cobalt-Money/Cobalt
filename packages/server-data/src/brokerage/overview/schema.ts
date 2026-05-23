import { z } from "@hono/zod-openapi";

import { enhancedBrokerageAccountSchema } from "../_shared/schema.js";
import { activitiesResponseSchema } from "../activities/schema.js";
import { balancesResponseSchema } from "../balances/schema.js";
import { holdingsNewsItemSchema } from "../holdings-news/schema.js";
import {
  portfolioSnapshotItemSchema,
  portfolioSnapshotsQuerySchema,
} from "../portfolio-snapshots/schema.js";
import { positionsResponseSchema } from "../positions/schema.js";

const mappedFinancialEventsList = z.array(holdingsNewsItemSchema);

export const brokerageOverviewQuerySchema = portfolioSnapshotsQuerySchema
  .pick({
    endDate: true,
    startDate: true,
  })
  .extend({
    activitiesLimit: z.coerce.number().min(1).max(500).optional(),
    positionsLimit: z.coerce.number().min(1).max(500).optional(),
  });

export const brokerageOverviewSchema = balancesResponseSchema
  .extend(activitiesResponseSchema.shape)
  .extend(positionsResponseSchema.shape)
  .extend({
    accounts: z.array(enhancedBrokerageAccountSchema),
    holdingsNews: mappedFinancialEventsList,
    portfolioSnapshots: z.array(portfolioSnapshotItemSchema),
    userBrokerages: z.array(z.string()),
  })
  .openapi("BrokerageOverview");

export type BrokerageOverviewQuery = z.infer<typeof brokerageOverviewQuerySchema>;
export type BrokerageOverviewResponse = z.infer<typeof brokerageOverviewSchema>;
