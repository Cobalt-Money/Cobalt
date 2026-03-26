import { financialEvents } from "@cobalt-web/db/schema/features";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Query ─────────────────────────────────────────────────────────

export const eventsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  topic: z.string().optional(),
});

// ── Response ──────────────────────────────────────────────────────

const sourceSchema = z.object({
  logo: z.string(),
  name: z.string(),
});

const financialEventRowSchema = createSelectSchema(financialEvents);

export const mappedFinancialEventSchema = financialEventRowSchema
  .pick({
    id: true,
  })
  .extend({
    imageUrl: z.string(),
    link: z.string(),
    publishedAt: z.string(),
    sources: z.array(sourceSchema),
    summary: z.string(),
    tickers: z.array(z.string()).optional(),
    title: z.string(),
    topics: z.array(z.string()).optional(),
    type: z.enum(["featured", "grid"]),
  });

export const eventsResponseSchema = z.object({
  events: z.array(mappedFinancialEventSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type MappedFinancialEvent = z.infer<typeof mappedFinancialEventSchema>;
export type PaginatedEventsResult = z.infer<typeof eventsResponseSchema>;
