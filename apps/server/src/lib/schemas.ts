import { z } from "@hono/zod-openapi";

export const errorResponse = z.object({
  error: z.string(),
});

export const successResponse = z.object({
  success: z.boolean(),
});

export const personalFinanceCategorySchema = z.object({
  confidence_level: z.string().optional(),
  detailed: z.string(),
  primary: z.string(),
});
