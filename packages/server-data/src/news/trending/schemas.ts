import { z } from "@hono/zod-openapi";

// ── Query ─────────────────────────────────────────────────────────

export const trendingQuerySchema = z.object({
  limit: z.coerce.number().min(1).default(50),
});

// ── Source ─────────────────────────────────────────────────────────

const trendingSourceSchema = z.object({
  logo: z.string(),
  name: z.string(),
});

// ── Headline ──────────────────────────────────────────────────────

export const trendingHeadlineSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  link: z.string(),
  publishedAt: z.string(),
  sentiment: z.string(),
  sources: z.array(trendingSourceSchema),
  summary: z.string(),
  tickers: z.array(z.string()),
  title: z.string(),
  type: z.enum(["featured", "grid"]),
});

// ── Response ──────────────────────────────────────────────────────

export const trendingResponseSchema = z.object({
  headlines: z.array(trendingHeadlineSchema),
});

// ── Inferred types ─────────────────────────────────────────────────

export type TrendingHeadline = z.infer<typeof trendingHeadlineSchema>;
