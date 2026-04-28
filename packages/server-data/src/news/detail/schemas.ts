import { eventArticles, financialEvents } from "@cobalt-web/db/schema/news";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Params ─────────────────────────────────────────────────────────

export const eventIdParamSchema = z.object({
  eventId: z.uuid(),
});

// ── Source ──────────────────────────────────────────────────────────

const sourceSchema = z.object({
  logo: z.string(),
  name: z.string(),
});

// ── Article ────────────────────────────────────────────────────────

const eventArticleRowSchema = createSelectSchema(eventArticles);

export const eventArticleSchema = eventArticleRowSchema
  .pick({
    id: true,
    imageUrl: true,
    newsUrl: true,
    sentiment: true,
    sourceName: true,
    text: true,
    title: true,
    type: true,
  })
  .extend({
    date: z.string().nullable(),
    tickers: z.array(z.string()).nullable(),
    topics: z.array(z.string()).nullable(),
  });

// ── Video ──────────────────────────────────────────────────────────

export const eventVideoSchema = eventArticleRowSchema
  .pick({
    id: true,
    imageUrl: true,
    newsUrl: true,
    sourceName: true,
    title: true,
  })
  .extend({
    date: z.string().nullable(),
  });

// ── Detailed Event ─────────────────────────────────────────────────

const financialEventRowSchema = createSelectSchema(financialEvents);

export const detailedEventSchema = financialEventRowSchema
  .pick({
    eventId: true,
    eventName: true,
    eventText: true,
    id: true,
    newsItems: true,
    sentiment: true,
    summary: true,
  })
  .extend({
    articles: z.array(eventArticleSchema),
    date: z.string().nullable(),
    keyPoints: z.array(z.string()).nullable(),
    sources: z.array(sourceSchema),
    tickers: z.array(z.string()).nullable(),
    topics: z.array(z.string()).nullable(),
    videos: z.array(eventVideoSchema),
  });

// ── Responses ──────────────────────────────────────────────────────

export const eventDetailResponseSchema = z.object({
  event: detailedEventSchema,
});

export const eventNotFoundSchema = z.object({
  error: z.string(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type EventArticleDTO = z.infer<typeof eventArticleSchema>;
export type EventVideoDTO = z.infer<typeof eventVideoSchema>;
export type DetailedFinancialEvent = z.infer<typeof detailedEventSchema>;
