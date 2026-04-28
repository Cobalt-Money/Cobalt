import { rssArticles, rssFeeds } from "@cobalt-web/db/schema/news";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Query ─────────────────────────────────────────────────────────

export const rssQuerySchema = z.object({
  category: z.string().optional(),
  company: z.string().optional(),
  limit: z.coerce.number().default(15),
  offset: z.coerce.number().default(0),
});

// ── Feed ──────────────────────────────────────────────────────────

const rssFeedRowSchema = createSelectSchema(rssFeeds);

export const rssFeedSchema = rssFeedRowSchema.pick({
  category: true,
  company: true,
  description: true,
  id: true,
  name: true,
});

// ── Article ───────────────────────────────────────────────────────

const rssArticleRowSchema = createSelectSchema(rssArticles);

export const rssArticleSchema = rssArticleRowSchema
  .pick({
    description: true,
    id: true,
    link: true,
    title: true,
  })
  .extend({
    createdAt: z.string(),
    feedIds: z.array(z.string()),
    feeds: z.array(rssFeedSchema),
    metadata: z.unknown().nullable(),
    publishedDate: z.string().nullable(),
  });

// ── Response ──────────────────────────────────────────────────────

export const rssResponseSchema = z.object({
  articles: z.array(rssArticleSchema),
  categories: z.array(z.string()),
  companies: z.array(z.string()),
});

// ── Inferred types ─────────────────────────────────────────────────

export type RssArticleDTO = z.infer<typeof rssArticleSchema>;
export type RssQueryResult = z.infer<typeof rssResponseSchema>;
