import { z } from "@hono/zod-openapi";

import { mappedFinancialEventSchema } from "../events/schemas.js";

// ── Query ──────────────────────────────────────────────────────────

export const forYouQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  topic: z.string().optional(),
});

// ── Response ───────────────────────────────────────────────────────

export const forYouResponseSchema = z.object({
  events: z.array(mappedFinancialEventSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

// ── Error ──────────────────────────────────────────────────────────

export const forYouErrorSchema = z.object({
  error: z.string(),
});

// ── Inferred types ─────────────────────────────────────────────────

export type ForYouResult = z.infer<typeof forYouResponseSchema>;
