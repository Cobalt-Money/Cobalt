import { z } from "@hono/zod-openapi";

import {
  eventsQuerySchema,
  eventsResponseSchema,
  mappedFinancialEventSchema,
} from "../../news/events/schemas.js";

export const holdingsNewsItemSchema = mappedFinancialEventSchema.openapi("HoldingsNewsItem");

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
    news: z.array(holdingsNewsItemSchema),
  })
  .omit({
    events: true,
  });

export type HoldingsNewsQuery = z.infer<typeof holdingsNewsQuerySchema>;
export type HoldingsNewsResponse = z.infer<typeof holdingsNewsResponseSchema>;
