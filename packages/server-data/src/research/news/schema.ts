import { z } from "@hono/zod-openapi";

export { symbolQuerySchema } from "../_shared/schema.js";

export const researchArticleSchema = z
  .object({
    date: z.string(),
    image_url: z.string().optional(),
    news_url: z.string(),
    sentiment: z.string(),
    source_name: z.string(),
    text: z.string(),
    tickers: z.array(z.string()),
    title: z.string(),
    topics: z.array(z.string()),
    type: z.string(),
  })
  .openapi("ResearchArticle");

export const newsResponseSchema = z
  .object({
    data: z.array(researchArticleSchema),
    total_items: z.number(),
    total_pages: z.number(),
  })
  .openapi("ResearchNewsResponse");

export type NewsResponse = z.infer<typeof newsResponseSchema>;
