import { z } from "@hono/zod-openapi";

// ── Error Envelope ────────────────────────────────────────────────

export const errorSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: "NOT_FOUND" }),
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string().openapi({ example: "Ticker not found" }),
  }),
});

/** Re-usable error response definition for createRoute */
export function errorResponse(status: number, description: string) {
  return {
    [status]: {
      content: { "application/json": { schema: errorSchema } },
      description,
    },
  };
}

// ── Pagination ────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  cursor: z.string().optional().openapi({ description: "Cursor for next page" }),
  limit: z.coerce
    .number()
    .min(1)
    .max(100)
    .default(20)
    .openapi({ description: "Items per page", example: 20 }),
});

export function paginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
  });
}
