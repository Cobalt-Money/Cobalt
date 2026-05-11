import { z } from "@hono/zod-openapi";

import { newsSourceSchema } from "../events/schemas.js";

// ── Query ─────────────────────────────────────────────────────────

export const trendingQuerySchema = z.object({
  limit: z.coerce.number().min(1).default(50),
});

// ── Headline ──────────────────────────────────────────────────────

export const trendingHeadlineSchema = z
  .object({
    id: z.string(),
    imageUrl: z.string(),
    link: z.string(),
    publishedAt: z.string(),
    sentiment: z.string(),
    sources: z.array(newsSourceSchema),
    summary: z.string(),
    tickers: z.array(z.string()),
    title: z.string(),
    type: z.enum(["featured", "grid"]),
  })
  .openapi("TrendingHeadline");

// ── Response ──────────────────────────────────────────────────────

export const trendingResponseSchema = z.object({
  headlines: z.array(trendingHeadlineSchema),
});

// ── Inferred types ─────────────────────────────────────────────────

export type TrendingHeadline = z.infer<typeof trendingHeadlineSchema>;
