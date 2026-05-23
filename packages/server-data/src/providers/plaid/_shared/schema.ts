import { z } from "@hono/zod-openapi";

/**
 * Generic success envelope for plaid workflow-resume style endpoints where
 * there is no meaningful resource to return (e.g. `/resolveLink`). Most CRUD
 * endpoints should return the affected resource instead.
 */
export const successResponseSchema = z.object({
  success: z.boolean(),
});
