import { z } from "@hono/zod-openapi";

export const hideCategorySchema = z.object({
  /** Reassign all tx + recurring rows to this cat before hiding. Null/omitted = leave assigned. */
  reassignTo: z.uuid().nullable().optional(),
});

export type HideCategory = z.infer<typeof hideCategorySchema>;
