import { z } from "@hono/zod-openapi";

/**
 * Partial update to an account. All fields optional; pass only what you want
 * to change. Pass `creditLimit: null` to clear the user override.
 */
export const patchAccountSchema = z
  .object({
    creditLimit: z.number().positive().nullable().optional().openapi({
      description:
        "User-override credit limit (positive magnitude). Null clears the override; omit to leave unchanged.",
    }),
  })
  .openapi("PatchAccount");

export type PatchAccount = z.infer<typeof patchAccountSchema>;
