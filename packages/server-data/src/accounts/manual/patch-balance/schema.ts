import { z } from "@hono/zod-openapi";

/**
 * Set a manual account's `balance.current` directly. Value is signed and
 * written as-is — caller controls the sign (e.g. positive for an asset,
 * negative for a liability).
 */
export const patchManualBalanceSchema = z
  .object({
    current: z.number().openapi({
      description:
        "New signed balance to write to balance.current. Stored verbatim; caller decides sign.",
    }),
  })
  .openapi("PatchManualBalance");

export type PatchManualBalance = z.infer<typeof patchManualBalanceSchema>;
