import { z } from "@hono/zod-openapi";

export const lastSeenResponseSchema = z.object({
  lastSeenAt: z.string().nullable(),
  shouldShowUpdates: z.boolean(),
});

export const deleteAccountResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});
